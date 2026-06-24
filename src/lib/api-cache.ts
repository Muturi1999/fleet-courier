/** Session-scoped API response cache — instant revisits, background refresh. */

import { normalizeListJson } from "./list-query";
import { PAGE_SIZE } from "./filters";

type CacheEntry = { data: unknown; at: number };

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function apiCacheKey(method: string, url: string): string {
  return `${method}:${url}`;
}

export function getApiCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  return entry?.data as T | undefined;
}

export function setApiCache<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

/** Drop cached GET responses for an API resource (e.g. `/api/invoices`). */
export function invalidateApiCache(resourcePrefix?: string): void {
  if (!resourcePrefix) {
    store.clear();
    return;
  }
  const needle = resourcePrefix.startsWith("GET:") ? resourcePrefix : `GET:${resourcePrefix}`;
  for (const key of store.keys()) {
    if (key.startsWith(needle)) store.delete(key);
  }
}

export async function fetchApiCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

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

export function prefetchApi(url: string, init?: RequestInit): void {
  const key = apiCacheKey("GET", url);
  if (getApiCache(key) !== undefined) return;
  void fetchApiCached(key, async () => {
    const res = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin" });
    if (!res.ok) throw new Error(`Prefetch failed: ${url}`);
    return res.json();
  }).catch(() => {});
}

export function prefetchCached<T>(url: string, parse: (json: unknown) => T): void {
  const key = apiCacheKey("GET", url);
  if (getApiCache(key) !== undefined) return;
  void fetchApiCached(key, async () => {
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) throw new Error(`Prefetch failed: ${url}`);
    return parse(await res.json());
  }).catch(() => {});
}

/** Prefetch a list endpoint with the same normalization as useCrud / usePaginatedList. */
export function prefetchList(url: string, mode: "array" | "page" = "page", pageSize = PAGE_SIZE): void {
  prefetchCached(url, (json) =>
    mode === "array" ? normalizeListJson<unknown>(json).data : normalizeListJson<unknown>(json, pageSize),
  );
}
