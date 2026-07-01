"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

function notificationHref(audience: NotificationAudience, n: WorkflowNotification): string | null {
    if (audience === "client") {
    if (n.type === "invoice_sent" && n.refId) return "/client/invoices";
    if (n.type === "work_ticket_sent" && n.refId) return "/client/work-tickets";
    if (n.type.startsWith("consolidated") && n.refId) return "/client/consolidated";
    if (n.type === "etims_filing_shared" && n.refId) return "/client/consolidated";
    if (n.type === "etims_submitted" && n.refId) return "/client/consolidated";
    return null;
  }
  if (n.type === "etims_submitted") return "/admin/etims/history";
  if (n.type.includes("invoice")) return "/admin/invoices";
  if (n.type.includes("work_ticket")) return "/admin/work-tickets";
  if (n.type.includes("consolidated") || n.type === "etims_filing_shared") return "/admin/soa";
  return "/admin/invoices";
}

export function NotificationsPage({ audience }: { audience: NotificationAudience }) {
  const router = useRouter();
  const { items, loading, unread, markRead, markAllRead } = useNotifications(audience);
  const portalLabel = audience === "admin" ? "Admin" : "G4S Client";

  const openNotification = async (n: WorkflowNotification) => {
    if (!n.read) await markRead(n.id);
    const href = notificationHref(audience, n);
    if (href) router.push(href);
  };

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
          items.map((n) => {
            const href = notificationHref(audience, n);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => void openNotification(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void openNotification(n);
                  }
                }}
                className={`cursor-pointer rounded-fleet border p-4 transition hover:border-fleet-gray-200 ${n.read ? "border-fleet-gray-100 bg-white" : "border-accent/30 bg-accent-light/40"}`}
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
                  {href && (
                    <Link
                      href={href}
                      className="btn-secondary btn-sm shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openNotification(n);
                      }}
                    >
                      Open
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
