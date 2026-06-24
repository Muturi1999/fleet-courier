"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconBuilding, IconChartBar, IconLogout, IconShieldLock } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { AUTH_COOKIE, PLATFORM_TOKEN_COOKIE } from "@/lib/auth-config";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  if (pathname === "/platform/login") {
    return <>{children}</>;
  }

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(AUTH_COOKIE);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    document.cookie = `${PLATFORM_TOKEN_COOKIE}=; path=/; max-age=0`;
    router.push("/platform/login");
  };

  if (loading || !user || user.role !== "platform_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fleet-gray-50 text-fleet-gray-400">
        Loading…
      </div>
    );
  }

  const nav = [
    { href: "/platform", label: "Overview", icon: IconChartBar },
    { href: "/platform/tenants", label: "Clients & partners", icon: IconBuilding },
  ];

  return (
    <div className="flex min-h-screen bg-fleet-gray-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-fleet-gray-200 bg-white">
        <div className="border-b border-fleet-gray-100 px-4 py-5">
          <div className="flex items-center gap-2 text-navy">
            <IconShieldLock size={20} />
            <div>
              <p className="text-sm font-semibold">Super Admin</p>
              <p className="text-[10px] uppercase tracking-wider text-fleet-gray-400">SwiftFleet platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-fleet-sm px-3 py-2 text-sm ${
                  active ? "bg-navy text-white" : "text-fleet-gray-600 hover:bg-fleet-gray-50"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-fleet-gray-100 p-3">
          <p className="truncate px-3 text-xs text-fleet-gray-500">{user.displayName}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-fleet-sm px-3 py-2 text-sm text-fleet-gray-600 hover:bg-fleet-gray-50"
          >
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
