"use client";

import { IconBell } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationAudience } from "@/lib/types";

export function NotificationNavLink({
  role,
  onNavigate,
}: {
  role: NotificationAudience;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { unread } = useNotifications(role);
  const href = role === "admin" ? "/admin/notifications" : "/client/notifications";
  const active = pathname === href;

  return (
    <Link href={href} onClick={onNavigate} className={`nav-item ${active ? "nav-item-active" : ""}`}>
      <IconBell size={17} className="w-5 shrink-0" />
      <span className="flex-1">Notifications</span>
      {unread > 0 && (
        <span className="ml-auto min-w-[18px] rounded-full bg-fleet-red px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
