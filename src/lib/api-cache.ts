/** Session-scoped API response cache — instant revisits with background revalidation. */

import { normalizeListJson } from "./list-query";
import { PAGE_SIZE } from "./filters";

type CacheEntry = { data: unknown; at: number };

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Fresh enough to paint without waiting on network. */
export const API_CACHE_TTL_MS = 60_000;
const PERSIST_PREFIX = "fc-api:";
const USER_KEY = "fc-cache-user";

export function apiCacheKey(method: string, url: string): string {
  return `${method}:${url}`;
}

function persistUserKey(): string {
  if (typeof sessionStorage === "undefined") return "anon";
  return sessionStorage.getItem(USER_KEY) || "anon";
}

function storageKey(cacheKey: string): string {
  return `${PERSIST_PREFIX}${persistUserKey()}:${cacheKey}`;
}

export function setApiCacheUser(username: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (username) sessionStorage.setItem(USER_KEY, username.trim().toLowerCase());
  else sessionStorage.removeItem(USER_KEY);
}

function readPersisted<T>(key: string): CacheEntry | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.at !== "number") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writePersisted(key: string, entry: CacheEntry) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* quota / private mode — ignore */
  }
}

function dropPersisted(prefixNeedle?: string) {
  if (typeof sessionStorage === "undefined") return;
  const user = persistUserKey();
  const fullPrefix = prefixNeedle
    ? `${PERSIST_PREFIX}${user}:${prefixNeedle}`
    : `${PERSIST_PREFIX}${user}:`;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(fullPrefix)) toRemove.push(k);
  }
  for (const k of toRemove) sessionStorage.removeItem(k);
}

function isFresh(entry: CacheEntry, ttlMs = API_CACHE_TTL_MS): boolean {
  return Date.now() - entry.at < ttlMs;
}

/** Memory hit, then sessionStorage hydrate. Expired entries still returned for SWR paint. */
export function getApiCache<T>(key: string, opts?: { allowStale?: boolean }): T | undefined {
  const allowStale = opts?.allowStale !== false;
  let entry = store.get(key);
  if (!entry) {
    entry = readPersisted(key);
    if (entry) store.set(key, entry);
  }
  if (!entry) return undefined;
  if (!allowStale && !isFresh(entry)) return undefined;
  return entry.data as T;
}

export function getApiCacheAge(key: string): number | null {
  const entry = store.get(key) ?? readPersisted(key);
  if (!entry) return null;
  return Date.now() - entry.at;
}

export function isApiCacheFresh(key: string, ttlMs = API_CACHE_TTL_MS): boolean {
  const entry = store.get(key) ?? readPersisted(key);
  return Boolean(entry && isFresh(entry, ttlMs));
}

export function setApiCache<T>(key: string, data: T): void {
  const entry = { data, at: Date.now() };
  store.set(key, entry);
  writePersisted(key, entry);
}

/** Drop cached GET responses (memory + session). Pass nothing to clear all for current user. */
export function invalidateApiCache(resourcePrefix?: string): void {
  if (!resourcePrefix) {
    store.clear();
    inFlight.clear();
    dropPersisted();
    return;
  }
  const needle = resourcePrefix.startsWith("GET:") ? resourcePrefix : `GET:${resourcePrefix}`;
  for (const key of [...store.keys()]) {
    if (key.startsWith(needle)) store.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(needle)) inFlight.delete(key);
  }
  dropPersisted(needle);
}

/** Full reset on login/logout — prevents empty/stale lists sticking across sessions. */
export function clearApiCache(): void {
  store.clear();
  inFlight.clear();
  if (typeof sessionStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(PERSIST_PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) sessionStorage.removeItem(k);
}

export const AUTH_CHANGED_EVENT = "fleet-auth-changed";

export function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export async function fetchApiCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { force?: boolean },
): Promise<T> {
  if (!opts?.force) {
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    // Serve fresh cache immediately (still allows callers to force a refresh).
    const fresh = getApiCache<T>(key, { allowStale: false });
    if (fresh !== undefined && isApiCacheFresh(key)) return fresh;
  }

  const promise = fetcher()
    .then((data) => {
      setApiCache(key, data);
      inFlight.delete(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}

async function fetchWithRetry<T>(fetcher: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetcher();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export function prefetchApi(url: string, init?: RequestInit): void {
  const key = apiCacheKey("GET", url);
  if (isApiCacheFresh(key)) return;
  void fetchApiCached(key, () =>
    fetchWithRetry(async () => {
      const res = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error(`Prefetch failed: ${url}`);
      return res.json();
    }),
  ).catch(() => {});
}

export function prefetchCached<T>(url: string, parse: (json: unknown) => T): void {
  const key = apiCacheKey("GET", url);
  if (isApiCacheFresh(key)) return;
  void fetchApiCached(key, () =>
    fetchWithRetry(async () => {
      const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) throw new Error(`Prefetch failed: ${url}`);
      return parse(await res.json());
    }),
  ).catch(() => {});
}

/** Prefetch a list endpoint with the same normalization as useCrud / usePaginatedList. */
export function prefetchList(url: string, mode: "array" | "page" = "page", pageSize = PAGE_SIZE): void {
  prefetchCached(url, (json) =>
    mode === "array" ? normalizeListJson<unknown>(json).data : normalizeListJson<unknown>(json, pageSize),
  );
}

export { fetchWithRetry };
