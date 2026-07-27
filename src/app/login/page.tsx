"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconTruckDelivery } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { REMEMBER_USERNAME_KEY } from "@/lib/auth-config";

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") ?? undefined;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password, tenantSlug, rememberMe);
    if (ok) {
      toast(`Welcome, ${username}`);
    } else {
      toast("Invalid username or password");
    }
  };

  return (
    <div className="auth-screen-centered">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center xs:mb-8">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-fleet-sm bg-accent text-navy xs:mb-4 xs:h-12 xs:w-12">
            <IconTruckDelivery size={22} className="xs:hidden" />
            <IconTruckDelivery size={24} className="hidden xs:block" />
          </div>
          <h1 className="auth-title text-lg font-semibold text-fleet-gray-800 xs:text-xl">Sign in</h1>
          <p className="mt-1 text-sm leading-relaxed text-fleet-gray-400">
            Fleet operator admin or partner portal
          </p>
          {tenantSlug ? (
            <p className="mt-2 break-all text-xs font-mono text-teal">Workspace: {tenantSlug}</p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-fleet-gray-400">
              Road Network Transporters · default workspace
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="auth-card space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Username or email</label>
            <input
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. client or you@company.com"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Password</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fleet-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-fleet-gray-300 text-teal focus:ring-teal/30"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me on this device
          </label>
          <button type="submit" className="btn-accent w-full justify-center py-2.5 text-sm">
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center xs:mt-6">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center text-sm text-fleet-gray-400 hover:text-navy"
          >
            ← Back to home
          </Link>
        </p>
        {!tenantSlug && (
          <p className="mt-3 text-center text-xs leading-relaxed text-fleet-gray-400">
            Fleet operator?{" "}
            <Link href="/onboarding" className="text-teal hover:underline">
              Get started
            </Link>
            {" · "}
            Partners sign in with credentials from your fleet operator
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
