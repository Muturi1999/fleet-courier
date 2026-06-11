export function fmtN(n?: number | null): string {
  return n ? n.toLocaleString() : "—";
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
