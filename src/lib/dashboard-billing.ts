import { formatBillingPeriodMonth, nextBillingMonthRange } from "./dates";
import { sortConsolidatedNewestFirst } from "./consolidation";
import type { ConsolidatedInvoice, Invoice } from "./types";

export type DashboardBillingPeriod = {
  from: string;
  to: string;
  label: string;
};

/** Active billing month = month after the latest settled (approved/paid) SOA. */
export function resolveActiveBillingPeriod(consolidated: ConsolidatedInvoice[]): DashboardBillingPeriod {
  const settled = consolidated
    .filter((c) => !c.supersededById && (c.status === "paid" || c.status === "approved"))
    .sort((a, b) => (b.periodEnd ?? b.periodStart ?? "").localeCompare(a.periodEnd ?? a.periodStart ?? ""));

  if (settled[0]?.periodEnd) {
    const range = nextBillingMonthRange(settled[0].periodEnd);
    return { ...range, label: formatBillingPeriodMonth(range.from) };
  }

  const open = sortConsolidatedNewestFirst(
    consolidated.filter((c) => !c.supersededById && c.status !== "rejected" && c.status !== "paid"),
  );
  if (open[0]?.periodStart) {
    const from = open[0].periodStart;
    const to = open[0].periodEnd ?? from;
    return { from, to, label: formatBillingPeriodMonth(from) };
  }

  const fallback = nextBillingMonthRange("2026-04-30");
  return { ...fallback, label: formatBillingPeriodMonth(fallback.from) };
}

export function invoiceInBillingPeriod(
  invoice: Pick<Invoice, "periodStart" | "periodEnd" | "period">,
  billing: Pick<DashboardBillingPeriod, "from" | "to">,
): boolean {
  const start = invoice.periodStart?.slice(0, 10);
  const end = (invoice.periodEnd ?? invoice.periodStart)?.slice(0, 10);
  if (start && end) {
    return start >= billing.from && end <= billing.to;
  }

  const label = invoice.period?.trim();
  if (!label) return false;
  const monthKey = label.split(/\s+(?:-|–|—)\s+/)[0]?.trim() ?? label;
  const parsed = Date.parse(`1 ${monthKey}`);
  if (Number.isNaN(parsed)) return false;
  const billingLabel = formatBillingPeriodMonth(billing.from);
  return monthKey.toLowerCase() === billingLabel.toLowerCase() || label.toLowerCase().startsWith(billingLabel.toLowerCase());
}

/** SOA for the active billing month (includes draft — admin dashboard focus). */
export function pickDashboardConsolidated(
  consolidated: ConsolidatedInvoice[],
  billing: Pick<DashboardBillingPeriod, "from" | "to">,
): ConsolidatedInvoice | null {
  const rows = sortConsolidatedNewestFirst(
    consolidated.filter(
      (c) =>
        !c.supersededById &&
        c.periodStart >= billing.from &&
        (c.periodEnd ?? c.periodStart) <= billing.to,
    ),
  );
  return rows[0] ?? null;
}
