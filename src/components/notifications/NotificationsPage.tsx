"use client";

import Link from "next/link";
import { IconChecks } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

function eventBadge(type: WorkflowNotification["type"]) {
  if (type.includes("approved")) return "approved" as const;
  if (type.includes("rejected")) return "rejected" as const;
  if (type.includes("sent")) return "sent" as const;
  if (type.includes("paid")) return "paid" as const;
  return "pending" as const;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPage({ audience }: { audience: NotificationAudience }) {
  const { items, loading, unread, markRead, markAllRead } = useNotifications(audience);
  const portalLabel = audience === "admin" ? "Admin" : "G4S Client";

  return (
    <>
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">Workflow notifications</h2>
          <p className="text-xs text-fleet-gray-400">
            {portalLabel} portal · Invoices &amp; SOA synced with {audience === "admin" ? "G4S client" : "Fleet Admin"}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn-secondary btn-sm" onClick={markAllRead}>
            <IconChecks size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-fleet-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-fleet-gray-400">No notifications yet</p>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`rounded-fleet border p-4 transition ${n.read ? "border-fleet-gray-100 bg-white" : "border-accent/30 bg-accent-light/40"}`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-fleet-gray-800">{n.title}</p>
                    <Badge variant={eventBadge(n.type)}>{n.type.replace(/_/g, " ")}</Badge>
                    {!n.read && <span className="text-[10px] font-semibold uppercase text-fleet-red">New</span>}
                  </div>
                  <p className="mt-1 text-xs text-fleet-gray-500">{n.message}</p>
                  <p className="mt-2 text-[10px] text-fleet-gray-400">
                    {formatTime(n.createdAt)} · from {n.actor}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.read && (
                    <button type="button" className="btn-secondary btn-sm" onClick={() => markRead(n.id)}>
                      Mark read
                    </button>
                  )}
                  {n.refId && audience === "client" && n.type === "invoice_sent" && (
                    <Link href="/client" className="btn-accent btn-sm">Review</Link>
                  )}
                  {n.refId && audience === "admin" && (
                    <Link href="/admin/invoices" className="btn-secondary btn-sm">Invoices</Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
