"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconEye, IconEyeOff, IconTruckDelivery } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant") ?? undefined;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password, tenantSlug);
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
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Username</label>
            <input
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="field-input pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-fleet-sm text-fleet-gray-400 hover:bg-fleet-gray-50 hover:text-fleet-gray-600"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>
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
