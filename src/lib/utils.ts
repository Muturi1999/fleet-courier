/** Coerce API values (Postgres decimals often arrive as strings) to a finite number. */
export function toNum(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Safely sum numeric fields from API rows. */
export function sumBy<T>(items: readonly T[], pick: (item: T) => unknown): number {
  return items.reduce((s, item) => s + toNum(pick(item)), 0);
}

export function fmtN(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return toNum(n).toLocaleString("en-KE");
}

export function formatMillions(n: unknown): string {
  const v = toNum(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

export function formatCompactKes(n: unknown): string {
  const v = toNum(n);
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(0)}K`;
  return `KES ${fmtN(v)}`;
}

export function formatRoute(dest?: string): string {
  if (!dest) return "—";
  return dest.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clsBadge(c: string): string {
  if (c === "15T") return "badge-sent";
  if (c === "CANTER") return "badge-pending";
  if (c === "VAN") return "badge-approved";
  return "badge-draft";
}

export function shiftOf(r: { m: number; a: number }): "both" | "morning" | "afternoon" {
  if (r.m > 0 && r.a > 0) return "both";
  if (r.m > 0) return "morning";
  return "afternoon";
}
