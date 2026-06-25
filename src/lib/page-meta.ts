import type { PageMeta } from "./types-meta";

export type { PageMeta };

export const adminPageMeta: Record<string, PageMeta> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Road Network Transporters Limited · G4S Kenya",
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
    subtitle: "Partner (buyer) and supplier details for invoices",
  },
  "/admin/etims": {
    title: "KRA eTIMS",
    subtitle: "Validate, submit and sync VAT with KRA via Digitax",
  },
  "/admin/etims/history": {
    title: "eTIMS filing history",
    subtitle: "Filed receipts and VAT records",
  },
  "/admin/etims/profile": {
    title: "eTIMS profile",
    subtitle: "Company KRA PIN and details for fiscal submission",
  },
  "/admin/invoices/approved": {
    title: "Approved invoices",
    subtitle: "Invoices approved by G4S",
  },
  "/admin/invoices/rejected": {
    title: "Rejected invoices",
    subtitle: "Invoices returned by G4S — edit and re-share",
  },
  "/admin/work-tickets/approved": {
    title: "Approved work tickets",
    subtitle: "Work tickets approved by G4S",
  },
  "/admin/work-tickets/rejected": {
    title: "Rejected work tickets",
    subtitle: "Work tickets returned by G4S",
  },
  "/admin/soa/approved": {
    title: "Approved consolidated invoices",
    subtitle: "SOA batches approved by G4S",
  },
  "/admin/soa/rejected": {
    title: "Rejected consolidated invoices",
    subtitle: "SOA batches returned by G4S",
  },
};

export const clientPageMeta: Record<string, PageMeta> = {
  "/client": {
    title: "Dashboard",
    subtitle: "Partner overview · current month statistics",
  },
  "/client/invoices": {
    title: "Invoices awaiting review",
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
  "/client/invoices/approved": {
    title: "Approved invoices",
    subtitle: "Invoices you have approved",
  },
  "/client/invoices/rejected": {
    title: "Rejected invoices",
    subtitle: "Invoices returned to Fleet Admin",
  },
  "/client/invoices/all": {
    title: "All invoices",
    subtitle: "Full invoice history",
  },
  "/client/work-tickets/approved": {
    title: "Approved work tickets",
    subtitle: "Work tickets you have approved",
  },
  "/client/work-tickets/rejected": {
    title: "Rejected work tickets",
    subtitle: "Work tickets returned to Fleet Admin",
  },
  "/client/consolidated": {
    title: "Consolidated invoices",
    subtitle: "Review SOA batches from Fleet Admin",
  },
  "/client/consolidated/approved": {
    title: "Approved consolidated invoices",
    subtitle: "SOA batches you have approved",
  },
  "/client/consolidated/rejected": {
    title: "Rejected consolidated invoices",
    subtitle: "SOA batches returned to Fleet Admin",
  },
};

export function getPageMeta(pathname: string, role: "admin" | "client"): PageMeta {
  const map = role === "admin" ? adminPageMeta : clientPageMeta;
  return map[pathname] ?? { title: "Fleet Courier", subtitle: "Fleet Travel Ltd" };
}
