import type { WorkflowNavGroup } from "./workflow-nav";

export const adminEtimsNav: WorkflowNavGroup = {
  href: "/admin/etims",
  label: "KRA eTIMS",
  children: [
    { href: "/admin/etims/history", label: "Filing history" },
    { href: "/admin/etims/profile", label: "Filing profile" },
  ],
};
