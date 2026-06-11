"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { IconEye, IconEyeOff, IconTruckDelivery } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast(`Welcome, ${username}`);
    } else {
      toast("Invalid username or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fleet-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-fleet-sm bg-accent text-navy">
            <IconTruckDelivery size={24} />
          </div>
          <h1 className="text-xl font-semibold text-fleet-gray-800">Sign in</h1>
          <p className="mt-1 text-sm text-fleet-gray-400">Fleet Courier Management System</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
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
                className="field-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fleet-gray-400 hover:text-fleet-gray-600"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-accent w-full justify-center py-2.5">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-fleet-gray-400 hover:text-navy">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
