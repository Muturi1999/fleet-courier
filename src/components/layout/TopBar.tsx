"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconMenu2, IconShieldCheck, IconTruckDelivery, IconUser } from "@tabler/icons-react";
import { getPageMeta } from "@/lib/page-meta";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";

function UserMenu({ size = "md" }: { size?: "sm" | "md" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnClass = size === "sm" ? "h-10 w-10 text-[11px]" : "h-[34px] w-[34px] text-[11px]";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={`flex items-center justify-center rounded-full bg-accent font-semibold text-navy ${btnClass}`}
        aria-label="User menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {user?.displayName?.slice(0, 2).toUpperCase() ?? <IconUser size={size === "sm" ? 18 : 16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[168px] rounded-fleet-sm border border-fleet-gray-100 bg-white py-1 shadow-fleet">
          <div className="border-b border-fleet-gray-50 px-3 py-2">
            <p className="text-xs font-semibold text-fleet-gray-800">{user?.displayName}</p>
            <p className="text-[10px] capitalize text-fleet-gray-400">{user?.role}</p>
          </div>
          <button
            type="button"
            className="block w-full px-3 py-2.5 text-left text-xs text-fleet-gray-600 hover:bg-fleet-gray-50 md:py-2"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationButton({ href, unread, size = "md" }: { href: string; unread: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-10 w-10" : "h-[34px] w-[34px]";
  const icon = size === "sm" ? 18 : 17;
  return (
    <Link
      href={href}
      className={`relative flex items-center justify-center rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 text-fleet-gray-600 hover:bg-fleet-gray-100 ${cls}`}
      aria-label="Notifications"
    >
      <IconBell size={icon} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fleet-red px-1 text-[9px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export function TopBar({ role, onMenuClick }: { role: "admin" | "client"; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { title, subtitle } = getPageMeta(pathname, role);
  const { unread } = useNotifications(role);
  const notifHref = role === "admin" ? "/admin/notifications" : "/client/notifications";

  return (
    <header className="relative z-[100] shrink-0 border-b border-fleet-gray-100 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-7 sm:pb-0 md:h-16 md:pt-0">
      {/* Mobile */}
      <div className="flex h-12 items-center gap-2 md:hidden">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 text-fleet-gray-700 active:bg-fleet-gray-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <IconMenu2 size={20} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-fleet-sm bg-accent text-navy">
            <IconTruckDelivery size={16} />
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-[11px] font-semibold leading-tight text-navy">Fleet Courier</p>
            <h1 className="truncate text-xs font-medium text-fleet-gray-600">{title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationButton href={notifHref} unread={unread} size="sm" />
          <UserMenu size="sm" />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden h-16 items-center gap-4 md:flex">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold text-fleet-gray-800">{title}</h1>
          <p className="mt-0.5 truncate text-xs text-fleet-gray-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-semibold text-[#15803D]">
            <IconShieldCheck size={11} /> eTIMS Active
          </span>
          <NotificationButton href={notifHref} unread={unread} />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
