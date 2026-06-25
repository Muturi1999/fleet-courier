"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconCoin,
  IconDotsVertical,
  IconFileDescription,
  IconFileInvoice,
  IconLayoutDashboard,
  IconLogout,
  IconMap2,
  IconReceipt,
  IconRoad,
  IconSettings,
  IconShieldCheck,
  IconTruck,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import { prefetchAdminRoute } from "@/lib/admin-prefetch";
import { isEtimsTenant } from "@/lib/etims-config";
import { adminEtimsNav } from "@/lib/etims-nav";
import { adminWorkflowGroups, clientWorkflowGroups } from "@/lib/workflow-nav";
import { NotificationNavLink } from "./NotificationNavLink";
import { SidebarNavGroup } from "./SidebarNavGroup";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const adminSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Main",
    items: [
      { href: "/admin", label: "Dashboard", icon: IconLayoutDashboard },
      { href: "/admin/schedule", label: "Schedule entry", icon: IconCalendarEvent },
      { href: "/admin/expenses", label: "Expenses", icon: IconReceipt },
      { href: "/admin/settings", label: "Billing (client)", icon: IconSettings },
    ],
  },
  {
    label: "Workflow",
    items: [],
  },
  {
    label: "Fleet",
    items: [
      { href: "/admin/vehicles", label: "Vehicles", icon: IconTruck },
      { href: "/admin/rates", label: "Rate card", icon: IconCoin },
      { href: "/admin/routes", label: "Routes & destinations", icon: IconMap2 },
      { href: "/admin/local-deliveries", label: "Local deliveries", icon: IconMap2 },
      { href: "/admin/safari", label: "Safari / upcountry", icon: IconRoad },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/reports", label: "Reports", icon: IconChartBar },
    ],
  },
];

const clientSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Partner",
    items: [
      { href: "/client", label: "Dashboard", icon: IconLayoutDashboard },
      { href: "/client/reports", label: "Reports", icon: IconChartBar },
    ],
  },
  {
    label: "Workflow",
    items: [],
  },
];

export function Sidebar({ role, onNavigate }: { role: "admin" | "client"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { profile } = useBillingProfile();
  const sections = role === "admin" ? adminSections : clientSections;
  const showEtims = role === "admin" && isEtimsTenant(user?.tenantSlug);
  const partnerLabel =
    role === "admin"
      ? profile?.client.name ?? "G4S Kenya"
      : profile?.supplier.name ?? "Road Network Transporters Limited";
  const operatorLabel = user?.tenantName ?? "Road Network Transporters Limited";

  return (
    <nav className="flex h-full min-h-0 w-60 shrink-0 flex-col overflow-y-auto bg-navy pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="border-b border-white/[0.08] px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-fleet-sm bg-accent text-navy">
            <IconTruckDelivery size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-tight text-white">Fleet Courier</span>
            <span className="text-[10px] uppercase tracking-wider text-white/45">
              {role === "admin" ? "Fleet Operator" : "Partner Portal"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-3.5 my-3 rounded-fleet-sm border border-white/[0.07] bg-white/[0.05] px-2.5 py-2">
        {role === "admin" && (
          <>
            <p className="mb-0.5 text-[10px] uppercase tracking-wider text-white/35">Fleet operator</p>
            <p className="mb-2 text-xs font-medium text-white/80">{operatorLabel}</p>
          </>
        )}
        <p className="mb-0.5 text-[10px] uppercase tracking-wider text-white/35">
          {role === "admin" ? "Partner (buyer)" : "Fleet operator"}
        </p>
        <p className="text-xs font-medium text-white/70">{partnerLabel}</p>
      </div>

      {sections.map((section) => (
        <div key={section.label} className="px-3.5 pb-1 pt-3.5">
          <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">{section.label}</p>
          {section.label === "Workflow" ? (
            <NotificationNavLink role={role} onNavigate={onNavigate} />
          ) : (
            <>
              {role === "admin" && section.label === "Main" && (
                <>
                  {section.items.slice(0, 2).map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        onMouseEnter={() => prefetchAdminRoute(item.href)}
                        onFocus={() => prefetchAdminRoute(item.href)}
                        className={`nav-item ${active ? "nav-item-active" : ""}`}
                      >
                        <Icon size={17} className="w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                  <SidebarNavGroup
                    item={adminWorkflowGroups.invoices}
                    icon={IconFileInvoice}
                    onNavigate={onNavigate}
                    onPrefetch={prefetchAdminRoute}
                  />
                  <SidebarNavGroup
                    item={adminWorkflowGroups.workTickets}
                    icon={IconClipboardList}
                    onNavigate={onNavigate}
                    onPrefetch={prefetchAdminRoute}
                  />
                  <SidebarNavGroup
                    item={adminWorkflowGroups.consolidated}
                    icon={IconFileDescription}
                    onNavigate={onNavigate}
                    onPrefetch={prefetchAdminRoute}
                  />
                  {showEtims && (
                    <SidebarNavGroup
                      item={adminEtimsNav}
                      icon={IconShieldCheck}
                      onNavigate={onNavigate}
                      onPrefetch={prefetchAdminRoute}
                    />
                  )}
                  {section.items.slice(2).map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        onMouseEnter={() => prefetchAdminRoute(item.href)}
                        onFocus={() => prefetchAdminRoute(item.href)}
                        className={`nav-item ${active ? "nav-item-active" : ""}`}
                      >
                        <Icon size={17} className="w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
              {role === "client" && section.label === "Partner" && (
                <>
                  {section.items.slice(0, 1).map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`nav-item ${active ? "nav-item-active" : ""}`}
                      >
                        <Icon size={17} className="w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                  <SidebarNavGroup
                    item={clientWorkflowGroups.invoices}
                    icon={IconFileInvoice}
                    onNavigate={onNavigate}
                  />
                  <SidebarNavGroup
                    item={clientWorkflowGroups.workTickets}
                    icon={IconClipboardList}
                    onNavigate={onNavigate}
                  />
                  <SidebarNavGroup
                    item={clientWorkflowGroups.consolidated}
                    icon={IconFileDescription}
                    onNavigate={onNavigate}
                  />
                  {section.items.slice(1).map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`nav-item ${active ? "nav-item-active" : ""}`}
                      >
                        <Icon size={17} className="w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
              {section.label !== "Main" && section.label !== "Partner" && section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    onMouseEnter={() => role === "admin" && prefetchAdminRoute(item.href)}
                    onFocus={() => role === "admin" && prefetchAdminRoute(item.href)}
                    className={`nav-item ${active ? "nav-item-active" : ""}`}
                  >
                    <Icon size={17} className="w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      ))}

      <div className="mt-auto border-t border-white/[0.07] p-3.5">
        <div className="flex items-center gap-2 rounded-fleet-sm px-2.5 py-2">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-navy">
            {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">{user?.displayName}</p>
            <p className="text-[10px] capitalize text-white/35">{user?.role} · {user?.username}</p>
          </div>
          <button type="button" onClick={logout} title="Logout" className="text-white/30 hover:text-white">
            <IconLogout size={15} />
          </button>
          <IconDotsVertical size={15} className="text-white/20" />
        </div>
      </div>
    </nav>
  );
}
