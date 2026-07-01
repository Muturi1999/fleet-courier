import { formatBillingPeriodMonth, formatEATDisplay } from "./dates";
import { normalizeCls } from "./vehicle-fleet";
import type { WorkTicket, WorkTicketJourneyLeg } from "./types";
import { sumBy, toNum } from "./utils";

/** Internal buckets for trip-type counts (shown as numbers only on subtotals). */
export type TripBucket = "morning" | "afternoon" | "outside" | "route";

export type ConsolidationBreakdownLine = {
  id: string;
  tripDate: string;
  plate: string;
  branch: string;
  ton: string;
  serviceType: string;
  route: string;
  /** Days/Trip multiplier from the linked invoice (minimum 1). */
  trips: number;
  tripBucket: TripBucket;
  cost: number;
  net: number;
  vat: number;
  total: number;
};

export type VehicleBreakdownGroup = {
  plate: string;
  ton: string;
  branch: string;
  lines: ConsolidationBreakdownLine[];
  net: number;
  vat: number;
  total: number;
  trips: number;
  tripBuckets: Record<TripBucket, number>;
};

export const CONSOLIDATION_BREAKDOWN_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "plate", label: "Reg No" },
  { key: "branch", label: "Branch" },
  { key: "ton", label: "Ton" },
  { key: "serviceType", label: "Service Type" },
  { key: "route", label: "Route" },
  { key: "trip", label: "Days/Trip" },
  { key: "cost", label: "Cost", align: "right" as const },
] as const;

/** Label columns before the two amount cells (ex VAT / inc VAT). */
export const BREAKDOWN_LABEL_COL_SPAN = 7;

export function fmtBreakdownMoney(n: number | string | null | undefined): string {
  return toNum(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function tonFromCls(cls?: string): string {
  const norm = normalizeCls(cls ?? "7T");
  if (norm === "Canter") return "4T";
  if (norm === "Van") return "1T";
  return norm;
}

export function deriveServiceType(input: {
  route?: string;
  legs?: WorkTicketJourneyLeg[];
}): string {
  const legType = input.legs
    ?.map((l) => l.journeyType?.trim() || (l as { serviceType?: string }).serviceType?.trim())
    .find(Boolean);
  if (legType) {
    const upper = legType.toUpperCase();
    if (upper.includes("ROUTE") || upper === "R") return "ROUTE";
    if (upper.includes("LOCAL") || upper.includes("S/S") || upper === "L") return "LOCAL";
    return upper;
  }
  const route = (input.route ?? "").trim();
  if (/^route\s/i.test(route) || /\broute\s+[a-z]/i.test(route)) return "ROUTE";
  return route ? "LOCAL" : "—";
}

function classifyTripBucket(input: {
  route?: string;
  serviceType?: string;
  runType?: string;
  legs?: WorkTicketJourneyLeg[];
}): TripBucket {
  const serviceType = input.serviceType ?? deriveServiceType(input);
  const route = (input.route ?? "").trim();
  const routeLower = route.toLowerCase();
  const runType = (input.runType ?? "").trim().toLowerCase();

  if (serviceType === "ROUTE" || /^route\s/i.test(route)) return "route";

  const outside =
    /busia|kisumu|eldoret|kitale|mombasa|nakuru|malaba|kampala|upcountry|route\s*b\s*-/i.test(route) &&
    !/nairobi\s+local/i.test(routeLower);
  if (outside) return "outside";

  if (runType.includes("afternoon") || /afternoon/i.test(route)) return "afternoon";
  return "morning";
}

/** Vehicle subtotal trip cell: total plus optional numeric breakdown e.g. "9 (3, 2, 1)". */
export function formatTripBucketSummary(trips: number, buckets: Record<TripBucket, number>): string {
  const parts = [buckets.morning, buckets.afternoon, buckets.outside, buckets.route].filter((n) => n > 0);
  if (parts.length <= 1) return String(trips);
  return `${trips} (${parts.join(", ")})`;
}

function emptyTripBuckets(): Record<TripBucket, number> {
  return { morning: 0, afternoon: 0, outside: 0, route: 0 };
}

function pickString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
  }
  return "";
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== "") return Number(val);
  }
  return 0;
}

/** Invoice Days/Trip for consolidation breakdown rows. */
export function tripDaysFromRow(row: Record<string, unknown>): number {
  const storedDays = pickNumber(row, "days");
  if (storedDays > 1) return Math.round(storedDays);

  const net = pickNumber(row, "net");
  const rate = pickNumber(row, "agreedRate", "agreed_rate", "dayRate", "day_rate");
  if (rate > 0 && net > 0) {
    const inferred = Math.round(net / rate);
    if (inferred >= 1) return inferred;
  }

  return Math.max(1, storedDays || 1);
}

/** Map API row, work ticket, or preview line into RNT breakdown format. */
export function mapToBreakdownLine(row: Record<string, unknown> | WorkTicket): ConsolidationBreakdownLine {
  const r = row as Record<string, unknown>;
  const legs = Array.isArray(r.legs) ? (r.legs as WorkTicketJourneyLeg[]) : undefined;
  const route = pickString(r, "route");
  const cls = pickString(r, "cls");
  const runType = pickString(r, "runType", "run_type");
  const net = pickNumber(r, "net");
  const vat = pickNumber(r, "vat");
  const serviceType = deriveServiceType({ route, legs });
  const tripBucket = classifyTripBucket({ route, serviceType, runType, legs });
  const trips = tripDaysFromRow(r);

  return {
    id: pickString(r, "id", "invoice_id", "work_ticket_id") || pickString(r, "serialNo", "serial_no") || route,
    tripDate: pickString(r, "tripDate", "trip_date", "serviceDate", "service_date"),
    plate: pickString(r, "plate"),
    branch: pickString(r, "branch") || "Nairobi",
    ton: tonFromCls(cls),
    serviceType,
    route: route || "—",
    trips,
    tripBucket,
    cost: net,
    net,
    vat,
    total: pickNumber(r, "total") || net + vat,
  };
}

export function mapTicketsToBreakdownLines(tickets: WorkTicket[]): ConsolidationBreakdownLine[] {
  return [...tickets]
    .map((t) => mapToBreakdownLine(t as unknown as Record<string, unknown>))
    .sort((a, b) => a.tripDate.localeCompare(b.tripDate) || a.plate.localeCompare(b.plate));
}

export function groupBreakdownByVehicle(lines: ConsolidationBreakdownLine[]): VehicleBreakdownGroup[] {
  const groups = new Map<string, VehicleBreakdownGroup>();

  for (const line of lines) {
    const plate = line.plate || "Unknown";
    const bucket =
      groups.get(plate) ??
      ({
        plate,
        ton: line.ton,
        branch: line.branch,
        lines: [],
        net: 0,
        vat: 0,
        total: 0,
        trips: 0,
        tripBuckets: emptyTripBuckets(),
      } satisfies VehicleBreakdownGroup);

    if (!bucket.ton && line.ton) bucket.ton = line.ton;
    if (!bucket.branch && line.branch) bucket.branch = line.branch;

    bucket.lines.push(line);
    bucket.net += line.net;
    bucket.vat += line.vat;
    bucket.total += line.total;
    bucket.trips += line.trips;
    bucket.tripBuckets[line.tripBucket] += line.trips;
    groups.set(plate, bucket);
  }

  return [...groups.values()].sort((a, b) => {
    const ad = a.lines[0]?.tripDate ?? "";
    const bd = b.lines[0]?.tripDate ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.plate.localeCompare(b.plate);
  });
}

export function sumBreakdownLines(lines: ConsolidationBreakdownLine[]) {
  return {
    net: sumBy(lines, (l) => l.net),
    vat: sumBy(lines, (l) => l.vat),
    total: sumBy(lines, (l) => l.total),
    trips: sumBy(lines, (l) => l.trips),
    count: lines.length,
  };
}

export function breakdownPeriodTitle(periodStart: string, periodEnd?: string): string {
  if (!periodStart) return "Consolidated breakdown";
  if (!periodEnd || periodStart.slice(0, 7) === periodEnd.slice(0, 7)) {
    return formatBillingPeriodMonth(periodStart);
  }
  return `${formatBillingPeriodMonth(periodStart)} – ${formatBillingPeriodMonth(periodEnd)}`;
}

export function formatBreakdownDate(iso: string): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  return formatEATDisplay(iso);
}
