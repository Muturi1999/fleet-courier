"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_COOKIE,
  authCookieValue,
  parseAuthCookie,
  REMEMBER_MAX_AGE_SEC,
  REMEMBER_USERNAME_KEY,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth-config";
import { clearApiCache, emitAuthChanged, setApiCacheUser } from "@/lib/api-cache";
import type { AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
    tenantSlug?: string,
    rememberMe?: boolean,
  ) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => false,
  logout: () => {},
});

function readStoredUser(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const fromCookie = parseAuthCookie(
    document.cookie.split("; ").find((c) => c.startsWith(`${AUTH_COOKIE}=`))?.split("=")[1],
  );
  if (fromCookie) return fromCookie;
  try {
    const raw = localStorage.getItem(AUTH_COOKIE);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null, rememberMe = false) {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
  if (user) {
    localStorage.setItem(AUTH_COOKIE, JSON.stringify(user));
    document.cookie = `${AUTH_COOKIE}=${authCookieValue(user)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    localStorage.removeItem(AUTH_COOKIE);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored);
    if (stored?.username) setApiCacheUser(stored.username);
    setLoading(false);
  }, []);

  const login = useCallback(async (
    username: string,
    password: string,
    tenantSlug?: string,
    rememberMe = false,
  ) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password, tenantSlug, rememberMe }),
      });
      if (!res.ok) return false;
      const { user: authUser } = (await res.json()) as { user: AuthUser };

      // Drop any prior session's empty/stale lists before navigating.
      clearApiCache();
      setApiCacheUser(authUser.username);
      persistUser(authUser, rememberMe);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY);
      }
      setUser(authUser);
      emitAuthChanged();

      // Let the auth cookie settle, then enter the app with a warm cache.
      await new Promise((r) => setTimeout(r, 0));
      router.push(authUser.role === "admin" ? "/admin" : "/client");
      return true;
    } catch {
      return false;
    }
  }, [router]);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    clearApiCache();
    setApiCacheUser(null);
    persistUser(null);
    setUser(null);
    emitAuthChanged();
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGuard({
  role,
  children,
}: {
  role: "admin" | "client";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/client");
    }
  }, [user, loading, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex h-screen items-center justify-center bg-fleet-gray-50 text-fleet-gray-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
