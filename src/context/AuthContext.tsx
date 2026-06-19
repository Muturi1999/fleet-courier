"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_COOKIE,
  authCookieValue,
  parseAuthCookie,
} from "@/lib/auth-config";
import type { AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, tenantSlug?: string) => Promise<boolean>;
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

function persistUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_COOKIE, JSON.stringify(user));
    document.cookie = `${AUTH_COOKIE}=${authCookieValue(user)}; path=/; max-age=86400; SameSite=Lax`;
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
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string, tenantSlug?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password, tenantSlug }),
      });
      if (!res.ok) return false;
      const { user: authUser } = (await res.json()) as { user: AuthUser };
      persistUser(authUser);
      setUser(authUser);
      router.push(authUser.role === "admin" ? "/admin" : "/client");
      return true;
    } catch {
      return false;
    }
  }, [router]);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    persistUser(null);
    setUser(null);
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
