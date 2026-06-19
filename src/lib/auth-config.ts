import type { AuthUser, UserRole } from "./types";

export const AUTH_COOKIE = "fc-auth";
export const AUTH_TOKEN_COOKIE = "fc-token";

export const CREDENTIALS: Record<string, { password: string; role: UserRole; displayName: string }> = {
  admin: { password: "admin123", role: "admin", displayName: "Fleet Admin" },
  client: { password: "client123", role: "client", displayName: "G4S Partner" },
};

export function validateLogin(username: string, password: string): AuthUser | null {
  const cred = CREDENTIALS[username.trim().toLowerCase()];
  if (!cred || cred.password !== password) return null;
  return { username: username.trim().toLowerCase(), role: cred.role, displayName: cred.displayName };
}

export function authCookieValue(user: AuthUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function parseAuthCookie(value: string | undefined): AuthUser | null {
  if (!value) return null;
  try {
    const user = JSON.parse(decodeURIComponent(value)) as AuthUser;
    if (user.role !== "admin" && user.role !== "client") return null;
    return user;
  } catch {
    return null;
  }
}
