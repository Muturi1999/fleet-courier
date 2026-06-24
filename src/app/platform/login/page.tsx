"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconShieldLock } from "@tabler/icons-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AUTH_COOKIE, PLATFORM_TOKEN_COOKIE, authCookieValue } from "@/lib/auth-config";
import type { AuthUser } from "@/lib/types";

function persistUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_COOKIE, JSON.stringify(user));
    document.cookie = `${AUTH_COOKIE}=${authCookieValue(user)}; path=/; max-age=28800; SameSite=Lax`;
  } else {
    localStorage.removeItem(AUTH_COOKIE);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    document.cookie = `${PLATFORM_TOKEN_COOKIE}=; path=/; max-age=0`;
  }
}

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid username or password");
        return;
      }
      const { user } = (await res.json()) as { user: AuthUser };
      persistUser(user);
      router.push("/platform");
    } catch {
      setError("Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-centered bg-navy">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-fleet-sm bg-accent text-navy">
            <IconShieldLock size={22} />
          </div>
          <h1 className="text-lg font-semibold text-white">SwiftFleet Super Admin</h1>
          <p className="mt-1 text-sm text-white/50">Platform owner console</p>
        </div>

        <form onSubmit={onSubmit} className="auth-card space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Username</label>
            <input
              className="field-input font-mono"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Password</label>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-accent w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign in as super admin"}
          </button>
        </form>

        <p className="mt-5 text-center">
          <Link href="/" className="text-sm text-white/40 hover:text-white">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
