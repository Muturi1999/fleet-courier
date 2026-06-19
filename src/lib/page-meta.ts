import type { PageMeta } from "./types-meta";

export type { PageMeta };

export const adminPageMeta: Record<string, PageMeta> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Fleet Travel Ltd — G4S Kenya · March 2026 · KES 17,624,460",
  },
  "/admin/schedule": {
    title: "Schedule entry",
    subtitle: "Create, edit and delete daily vehicle runs",
  },
  "/admin/invoices": {
    title: "Invoices",
    subtitle: "View and manage invoice records",
  },
  "/admin/work-tickets": {
    title: "Work tickets",
    subtitle: "Create G4S vehicle work tickets and share with client",
  },
  "/admin/soa": {
    title: "Consolidated billing & SOA",
    subtitle: "Group work tickets into consolidated invoices for G4S approval",
  },
  "/admin/vehicles": {
    title: "Fleet vehicles",
    subtitle: "Register and manage fleet vehicles",
  },
  "/admin/rates": {
    title: "Rate card",
    subtitle: "Edit route rates · Excl. 16% VAT",
  },
  "/admin/local-deliveries": {
    title: "Local deliveries",
    subtitle: "April 2026 logbook · Nairobi routes",
  },
  "/admin/safari": {
    title: "Safari / upcountry",
    subtitle: "April 2026 logbook · Upcountry trips",
  },
  "/admin/routes": {
    title: "Routes & destinations",
    subtitle: "Destination revenue breakdown · March 2026",
  },
  "/admin/notifications": {
    title: "Notifications",
    subtitle: "Workflow updates from G4S client portal",
  },
  "/admin/reports": {
    title: "Reports & analytics",
    subtitle: "Revenue, P&L, VAT, fleet and destination breakdowns",
  },
  "/admin/expenses": {
    title: "Expenses",
    subtitle: "Record operating costs for P&L reporting",
  },
  "/admin/settings": {
    title: "Billing settings",
    subtitle: "Client & supplier details for invoices and eTIMS",
  },
};

export const clientPageMeta: Record<string, PageMeta> = {
  "/client": {
    title: "Invoices",
    subtitle: "Review and approve invoices · G4S Courier Services",
  },
  "/client/work-tickets": {
    title: "Work tickets",
    subtitle: "Vehicle work tickets from Road Network Transporters",
  },
  "/client/portal": {
    title: "Invoices",
    subtitle: "Invoices awaiting approval",
  },
  "/client/reports": {
    title: "Reports",
    subtitle: "Monthly revenue, VAT and fleet analytics · export to Excel",
  },
  "/client/notifications": {
    title: "Notifications",
    subtitle: "Invoices and SOA updates from Fleet Admin",
  },
};

export function getPageMeta(pathname: string, role: "admin" | "client"): PageMeta {
  const map = role === "admin" ? adminPageMeta : clientPageMeta;
  return map[pathname] ?? { title: "Fleet Courier", subtitle: "Fleet Travel Ltd" };
}
