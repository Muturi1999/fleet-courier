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
    cls: "7T",
    dest: "",
    runType: "Morning",
    rate: 8500,
    days: 1,
    cost: 8500,
    vat: 1360,
    total: 9860,
    month: currentBillingPeriodLabel(),
    periodStart: range.from,
    periodEnd: range.to,
    serviceDate: todayEAT(),
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

/** Build a clean POST/PUT body for schedules API */
export function schedulePayload(form: Omit<ScheduleEntry, "id">) {
  const periodStart = form.periodStart ?? form.serviceDate ?? todayEAT();
  const periodEnd = form.periodEnd ?? periodStart;
  const month = form.month?.trim() || formatPeriodLabel(periodStart, periodEnd);

  return {
    plate: form.plate.trim().toUpperCase(),
    cls: form.cls,
    dest: form.dest.trim().toUpperCase(),
    runType: form.runType,
    rate: Number(form.rate),
    days: Math.max(1, Math.round(Number(form.days) || 1)),
    cost: Number(form.cost),
    vat: Number(form.vat),
    total: Number(form.total),
    month,
    periodStart: dateKey(periodStart),
    periodEnd: dateKey(periodEnd),
    serviceDate: dateKey(form.serviceDate ?? periodStart),
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
