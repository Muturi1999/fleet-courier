/** Sidebar workflow sub-routes — main href stays the primary list; children are filtered follow-up views. */

export type WorkflowNavChild = { href: string; label: string };

export type WorkflowNavGroup = {
  href: string;
  label: string;
  children: WorkflowNavChild[];
};

export const adminWorkflowGroups: Record<"invoices" | "workTickets" | "consolidated", WorkflowNavGroup> = {
  invoices: {
    href: "/admin/invoices",
    label: "Invoices",
    children: [
      { href: "/admin/invoices/approved", label: "Approved" },
      { href: "/admin/invoices/rejected", label: "Rejected" },
    ],
  },
  workTickets: {
    href: "/admin/work-tickets",
    label: "Work tickets",
    children: [
      { href: "/admin/work-tickets/approved", label: "Approved" },
      { href: "/admin/work-tickets/rejected", label: "Rejected" },
    ],
  },
  consolidated: {
    href: "/admin/soa",
    label: "Consolidated billing",
    children: [
      { href: "/admin/soa/approved", label: "Approved" },
      { href: "/admin/soa/rejected", label: "Rejected" },
    ],
  },
};

export const clientWorkflowGroups: Record<"invoices" | "workTickets" | "consolidated", WorkflowNavGroup> = {
  invoices: {
    href: "/client/invoices",
    label: "Invoices",
    children: [
      { href: "/client/invoices/approved", label: "Approved" },
      { href: "/client/invoices/rejected", label: "Rejected" },
      { href: "/client/invoices/all", label: "All invoices" },
    ],
  },
  workTickets: {
    href: "/client/work-tickets",
    label: "Work tickets",
    children: [
      { href: "/client/work-tickets/approved", label: "Approved" },
      { href: "/client/work-tickets/rejected", label: "Rejected" },
    ],
  },
  consolidated: {
    href: "/client/consolidated",
    label: "Consolidated invoices",
    children: [
      { href: "/client/consolidated/approved", label: "Approved" },
      { href: "/client/consolidated/rejected", label: "Rejected" },
    ],
  },
};

export function workflowGroupActive(pathname: string, group: WorkflowNavGroup): boolean {
  if (pathname === group.href) return true;
  return group.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
}
