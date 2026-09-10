import {
  currentBillingPeriodLabel,
  currentMonthRangeEAT,
  dateKey,
  formatPeriodLabel,
  todayEAT,
} from "./dates";
import type { ScheduleEntry } from "./types";

export function emptyScheduleForm(): Omit<ScheduleEntry, "id"> {
  const range = currentMonthRangeEAT();
  return {
    plate: "",
    cls: "",
    dest: "",
    runType: "Morning",
    rate: 0,
    days: 0,
    cost: 0,
    vat: 0,
    total: 0,
    month: currentBillingPeriodLabel(),
    periodStart: range.from,
    periodEnd: range.to,
    serviceDate: "",
    status: "saved",
  };
}

export function syncSchedulePeriod(
  form: Omit<ScheduleEntry, "id">,
  patch: Partial<Pick<ScheduleEntry, "periodStart" | "periodEnd">>,
): Pick<ScheduleEntry, "periodStart" | "periodEnd" | "month"> {
  const periodStart = patch.periodStart ?? form.periodStart ?? form.serviceDate ?? todayEAT();
  const periodEnd = patch.periodEnd ?? form.periodEnd ?? periodStart;
  return {
    periodStart,
    periodEnd,
    month: formatPeriodLabel(periodStart, periodEnd),
  };
}

/** Build a clean POST/PUT body for schedules API — blank fields become empty/zero, not blocked. */
export function schedulePayload(form: Omit<ScheduleEntry, "id">) {
  const periodStart = dateKey(form.periodStart) || dateKey(form.serviceDate) || "";
  const periodEnd = dateKey(form.periodEnd) || periodStart;
  const month =
    form.month?.trim() ||
    (periodStart ? formatPeriodLabel(periodStart, periodEnd || periodStart) : "");
  const rate = Number(form.rate) || 0;
  const days = Math.max(0, Math.round(Number(form.days) || 0));
  const cost = Number(form.cost) || 0;
  const vat = Number(form.vat) || 0;
  const total = Number(form.total) || 0;

  return {
    plate: form.plate.trim().toUpperCase(),
    cls: form.cls.trim() || "",
    dest: form.dest.trim().toUpperCase(),
    runType: form.runType?.trim() || "Morning",
    rate,
    days,
    cost,
    vat,
    total,
    month: month || "",
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    serviceDate: dateKey(form.serviceDate) || undefined,
    status: form.status ?? "saved",
  };
}

export function schedulePeriodDisplay(entry: Pick<ScheduleEntry, "month" | "periodStart" | "periodEnd" | "serviceDate">): string {
  if (entry.month?.trim()) return entry.month.trim();
  if (entry.periodStart) {
    return formatPeriodLabel(entry.periodStart, entry.periodEnd ?? entry.periodStart);
  }
  return entry.serviceDate ?? "—";
}

export const SCHEDULE_RUN_TYPES = ["Morning", "Afternoon"] as const;

export function canShareSchedule(entry: Pick<ScheduleEntry, "status">): boolean {
  return entry.status === "draft";
}

export async function shareScheduleEntry(id: string): Promise<Response> {
  return fetch(`/api/schedules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status: "saved" }),
  });
}
