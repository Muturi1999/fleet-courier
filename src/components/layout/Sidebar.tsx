"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBrain,
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
  IconMapPin,
  IconPackage,
  IconReceipt,
  IconRoad,
  IconRoute,
  IconSettings,
  IconShieldCheck,
  IconTool,
  IconTruck,
  IconTruckDelivery,
  IconUser,
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { useBillingProfile } from "@/hooks/useBillingProfile";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { prefetchAdminRoute } from "@/lib/admin-prefetch";
import { isEtimsTenant } from "@/lib/etims-config";
import { adminEtimsNav } from "@/lib/etims-nav";
import type { TenantFeatureKey } from "@/lib/tenant-capabilities";
import { adminWorkflowGroups, clientWorkflowGroups } from "@/lib/workflow-nav";
import { NotificationNavLink } from "./NotificationNavLink";
import { SidebarNavGroup } from "./SidebarNavGroup";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  feature?: TenantFeatureKey;
  pilot?: boolean;
};

const adminMainItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/admin/schedule", label: "Schedule entry", icon: IconCalendarEvent, feature: "schedule" },
];

const adminOperationsItems: NavItem[] = [
  { href: "/admin/orders", label: "Orders", icon: IconPackage, feature: "orders", pilot: true },
  { href: "/admin/dispatch", label: "Dispatch center", icon: IconRoute, feature: "dispatch", pilot: true },
  { href: "/admin/drivers", label: "Drivers", icon: IconUser, feature: "drivers", pilot: true },
  { href: "/admin/tracking", label: "Live tracking", icon: IconMapPin, feature: "gps_tracking", pilot: true },
  { href: "/admin/maintenance", label: "Maintenance", icon: IconTool, feature: "maintenance", pilot: true },
  { href: "/admin/ops", label: "AI operations", icon: IconBrain, feature: "ai_ops", pilot: true },
];

const adminTailItems: NavItem[] = [
  { href: "/admin/expenses", label: "Expenses", icon: IconReceipt, feature: "expenses" },
  { href: "/admin/settings", label: "Billing (client)", icon: IconSettings, feature: "billing_profile" },
];

const adminFleetItems: NavItem[] = [
  { href: "/admin/vehicles", label: "Vehicles", icon: IconTruck, feature: "vehicles" },
  { href: "/admin/rates", label: "Rate card", icon: IconCoin, feature: "rates" },
  { href: "/admin/routes", label: "Routes & destinations", icon: IconMap2, feature: "routes" },
  { href: "/admin/local-deliveries", label: "Local deliveries", icon: IconMap2, feature: "local_deliveries" },
  { href: "/admin/safari", label: "Safari / upcountry", icon: IconRoad, feature: "safari" },
];

const clientSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Partner",
    items: [
      { href: "/client", label: "Dashboard", icon: IconLayoutDashboard },
      { href: "/client/orders", label: "Shipments", icon: IconPackage, feature: "customer_shipments", pilot: true },
      { href: "/client/reports", label: "Reports", icon: IconChartBar, feature: "reports" },
    ],
  },
  {
    label: "Workflow",
    items: [],
  },
];

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => prefetchAdminRoute(item.href)}
      onFocus={() => prefetchAdminRoute(item.href)}
      className={`nav-item ${active ? "nav-item-active" : ""}`}
    >
      <Icon size={17} className="w-5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.pilot && (
        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-dark">
          Pilot
        </span>
      )}
    </Link>
  );
}

function visibleItems(items: NavItem[], featureEnabled: (f: TenantFeatureKey) => boolean) {
  return items.filter((item) => !item.feature || featureEnabled(item.feature));
}

export function Sidebar({ role, onNavigate }: { role: "admin" | "client"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { profile } = useBillingProfile();
  const { featureEnabled } = useTenantCapabilities();
  const showEtims = role === "admin" && isEtimsTenant(user?.tenantSlug);
  const partnerLabel =
    role === "admin"
      ? profile?.client.name ?? "G4S Kenya"
      : profile?.supplier.name ?? "Road Network Transporters Limited";
  const operatorLabel = user?.tenantName ?? "Road Network Transporters Limited";

  const adminMain = visibleItems(adminMainItems, featureEnabled);
  const adminOps = visibleItems(adminOperationsItems, featureEnabled);
  const adminTail = visibleItems(adminTailItems, featureEnabled);
  const adminFleet = visibleItems(adminFleetItems, featureEnabled);
  const adminAnalytics = featureEnabled("reports")
    ? [{ href: "/admin/reports", label: "Reports", icon: IconChartBar }]
    : [];

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

      {role === "admin" ? (
        <>
          <div className="px-3.5 pb-1 pt-3.5">
            <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">Main</p>
            {adminMain.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
            {featureEnabled("workflow_invoices") && (
              <SidebarNavGroup
                item={adminWorkflowGroups.invoices}
                icon={IconFileInvoice}
                onNavigate={onNavigate}
                onPrefetch={prefetchAdminRoute}
              />
            )}
            {featureEnabled("workflow_work_tickets") && (
              <SidebarNavGroup
                item={adminWorkflowGroups.workTickets}
                icon={IconClipboardList}
                onNavigate={onNavigate}
                onPrefetch={prefetchAdminRoute}
              />
            )}
            {featureEnabled("workflow_consolidated") && (
              <SidebarNavGroup
                item={adminWorkflowGroups.consolidated}
                icon={IconFileDescription}
                onNavigate={onNavigate}
                onPrefetch={prefetchAdminRoute}
              />
            )}
            {showEtims && (
              <SidebarNavGroup
                item={adminEtimsNav}
                icon={IconShieldCheck}
                onNavigate={onNavigate}
                onPrefetch={prefetchAdminRoute}
              />
            )}
            {adminTail.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>

          <div className="px-3.5 pb-1 pt-3.5">
            <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">Workflow</p>
            <NotificationNavLink role={role} onNavigate={onNavigate} />
          </div>

          {adminOps.length > 0 && (
            <div className="px-3.5 pb-1 pt-3.5">
              <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">Operations</p>
              {adminOps.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          )}

          {adminFleet.length > 0 && (
            <div className="px-3.5 pb-1 pt-3.5">
              <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">Fleet</p>
              {adminFleet.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          )}

          {adminAnalytics.length > 0 && (
            <div className="px-3.5 pb-1 pt-3.5">
              <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">Analytics</p>
              {adminAnalytics.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </>
      ) : (
        clientSections.map((section) => (
          <div key={section.label} className="px-3.5 pb-1 pt-3.5">
            <p className="mb-1 px-1.5 text-[10px] uppercase tracking-wider text-white/28">{section.label}</p>
            {section.label === "Workflow" ? (
              <NotificationNavLink role={role} onNavigate={onNavigate} />
            ) : (
              <>
                {visibleItems(section.items, featureEnabled)
                  .slice(0, 1)
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`nav-item ${pathname === item.href ? "nav-item-active" : ""}`}
                    >
                      <item.icon size={17} className="w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  ))}
                {featureEnabled("workflow_invoices") && (
                  <SidebarNavGroup
                    item={clientWorkflowGroups.invoices}
                    icon={IconFileInvoice}
                    onNavigate={onNavigate}
                  />
                )}
                {featureEnabled("workflow_work_tickets") && (
                  <SidebarNavGroup
                    item={clientWorkflowGroups.workTickets}
                    icon={IconClipboardList}
                    onNavigate={onNavigate}
                  />
                )}
                {featureEnabled("workflow_consolidated") && (
                  <SidebarNavGroup
                    item={clientWorkflowGroups.consolidated}
                    icon={IconFileDescription}
                    onNavigate={onNavigate}
                  />
                )}
                {visibleItems(section.items, featureEnabled)
                  .slice(1)
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`nav-item ${pathname === item.href ? "nav-item-active" : ""}`}
                    >
                      <item.icon size={17} className="w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  ))}
              </>
            )}
          </div>
        ))
      )}

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
