/** East Africa Time — Kenya (UTC+3, no DST) */
export const EAT_TIMEZONE = "Africa/Nairobi";

/** YYYY-MM-DD for date inputs, in East Africa */
export function todayEAT(): string {
  return formatEATIso(new Date());
}

/** Strip ISO datetime to YYYY-MM-DD (handles `2026-06-22T00:00:00.000Z`) */
export function dateKey(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return formatEATIso(new Date(s));
}

/** Format any date value as dd/mm/yyyy in East Africa */
export function formatEATDisplay(value?: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : parseEATDate(String(value));
  if (!d || Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  return `${day}/${month}/${year}`;
}

/** Billing period label e.g. "June 2026" */
export function formatBillingPeriodMonth(value: string): string {
  const key = dateKey(value);
  if (!key) return "";
  const d = new Date(`${key}T12:00:00+03:00`);
  return d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: EAT_TIMEZONE });
}

/** Current month label for new invoices */
export function currentBillingPeriodLabel(): string {
  return formatBillingPeriodMonth(todayEAT());
}

/** `<input type="month">` value → "April 2026" */
export function monthInputToPeriodLabel(yyyyMm: string): string {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm;
  const [year, month] = yyyyMm.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: EAT_TIMEZONE });
}

/** "April 2026" / "Jun 2026" → `2026-04` for month input */
export function periodLabelToMonthInput(period?: string): string {
  if (!period?.trim()) return "";
  const parsed = Date.parse(`1 ${period.trim()}`);
  if (Number.isNaN(parsed)) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(parsed));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

/** Compact billing period for DB (legacy range support) */
export function formatPeriodLabel(from: string, to?: string): string {
  const key = dateKey(from);
  if (!key) return "";
  const d = new Date(`${key}T12:00:00+03:00`);
  const month = d.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: EAT_TIMEZONE });
  const toKey = to ? dateKey(to) : key;
  if (toKey && toKey !== key) {
    const d2 = new Date(`${toKey}T12:00:00+03:00`);
    const month2 = d2.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: EAT_TIMEZONE });
    if (month !== month2) return `${month} – ${month2}`;
  }
  return month;
}

/** YYYY-MM-DD in East Africa from Date or ISO string */
export function formatEATIso(value: Date | string): string {
  const d = value instanceof Date ? value : parseEATDate(String(value));
  if (!d || Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseEATDate(iso: string): Date | null {
  const key = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return new Date(`${key}T12:00:00+03:00`);
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** First and last day of current month in EAT */
export function currentMonthRangeEAT(): { from: string; to: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}
