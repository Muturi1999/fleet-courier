/** Public-facing SwiftFleet / Fleet Logistics brand — landing & onboarding only. */
export const PLATFORM = {
  productName: "SwiftFleet",
  productLine: "Fleet Logistics",
  companyName: "SwiftFleet Ltd",
  tagline: "Fleet Logistics by SwiftFleet Ltd",
  shortTagline: "End-to-end fleet logistics",
} as const;

export type LogisticsStage = {
  id: string;
  label: string;
  detail: string;
};

/** Full contract lifecycle shown on hero and onboarding. */
export const LOGISTICS_PIPELINE: LogisticsStage[] = [
  { id: "schedule", label: "Schedule", detail: "Routes, rates & vehicles" },
  { id: "dispatch", label: "Dispatch", detail: "Local & upcountry runs" },
  { id: "tickets", label: "Work tickets", detail: "Trip logs & approvals" },
  { id: "invoice", label: "Invoice", detail: "VAT, eTIMS & billing" },
  { id: "partner", label: "Partner", detail: "Client portal review" },
  { id: "settle", label: "Settle", detail: "SOA, reports & payment" },
];
