import { NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE, parseAuthCookie } from "./auth-config";

function backendBaseUrl(): string | null {
  const raw = process.env.FLEET_BACKEND_URL ?? process.env.NEXT_PUBLIC_FLEET_BACKEND_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function backendEnabled(): boolean {
  return Boolean(backendBaseUrl());
}

export function backendUrl(): string {
  const base = backendBaseUrl();
  if (!base) throw new Error("FLEET_BACKEND_URL is not configured");
  return base;
}

function tokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}

/** Server-side login used only when service auth is explicitly enabled (CI / scripts). */
async function serviceAccountToken(role: "admin" | "client"): Promise<string> {
  if (process.env.FLEET_ALLOW_SERVICE_AUTH !== "true") {
    throw new Error("No user session — sign in again");
  }
  const tenantSlug = process.env.FLEET_BACKEND_TENANT ?? "g4s-kenya";
  const username =
    role === "admin"
      ? (process.env.FLEET_BACKEND_ADMIN_USER ?? "admin")
      : (process.env.FLEET_BACKEND_CLIENT_USER ?? "client");
  const password =
    role === "admin"
      ? (process.env.FLEET_BACKEND_ADMIN_PASS ?? "admin123")
      : (process.env.FLEET_BACKEND_CLIENT_PASS ?? "client123");

  const res = await fetch(`${backendUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantSlug, username, password }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Backend service auth failed");
  const json = (await res.json()) as { accessToken: string };
  return json.accessToken;
}

function roleFromRequest(req: NextRequest): "admin" | "client" {
  const user = parseAuthCookie(req.cookies.get("fc-auth")?.value);
  return user?.role ?? "admin";
}

export async function backendRequest(
  req: NextRequest,
  path: string,
  init?: RequestInit,
  role?: "admin" | "client",
) {
  const token = tokenFromRequest(req) ?? (await serviceAccountToken(role ?? roleFromRequest(req)));
  return fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function backendLogin(body: {
  tenantSlug: string;
  username: string;
  password: string;
}) {
  return fetch(`${backendUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
