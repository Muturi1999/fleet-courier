/** Road Network fleet list — sourced from RNTL FLEET LIST PDF (Jun 2026) */
export type FleetRow = { plate: string; cls: string };

function clsFromLabel(label: string): string {
  const t = label.trim().toLowerCase();
  if (t.includes("15 ton")) return "15T";
  if (t.includes("canter") || t.includes("4 ton")) return "Canter";
  if (t.includes("van") || t.includes("1 ton")) return "Van";
  return "7T";
}

const RAW: [string, string][] = [
  ["KBH 667W", "15 Tonnes Truck"],
  ["KDR 566W", "7 Tonnes Truck"],
  ["KDE 073Q", "7 Tonnes Truck"],
  ["KDJ 403Z", "7 Tonnes Truck"],
  ["KDB 207S", "7 Tonnes Truck"],
  ["KCX 252Z", "7 Tonnes Truck"],
  ["KDA 047T", "7 Tonnes Truck"],
  ["KDE 081U", "7 Tonnes Truck"],
  ["KBQ 492U", "7 Tonnes Truck"],
  ["KDC 183M", "7 Tonnes Truck"],
  ["KDD 587G", "7 Tonnes Truck"],
  ["KDG 409G", "7 Tonnes Truck"],
  ["KBG 004V", "7 Tonnes Truck"],
  ["KCY 187F", "7 Tonnes Truck"],
  ["KDD 975A", "7 Tonnes Truck"],
  ["KCF 894Q", "7 Tonnes Truck"],
  ["KBZ 640M", "7 Tonnes Truck"],
  ["KDE 320P", "7 Tonnes Truck"],
  ["KCM 731A", "7 Tonnes Truck"],
  ["KDR 988J", "7 Tonnes Truck"],
  ["KAV 039M", "7 Tonnes Truck"],
  ["KDC 339G", "7 Tonnes Truck"],
  ["KCC 430Q", "7 Tonnes Truck"],
  ["KDM 265G", "7 Tonnes Truck"],
  ["KCA 174Q", "7 Tonnes Truck"],
  ["KDK 488G", "7 Tonnes Truck"],
  ["KDD 547G", "7 Tonnes Truck"],
  ["KDJ 027S", "7 Tonnes Truck"],
  ["KBH 694Q", "7 Tonnes Truck"],
  ["KBL 094E", "7 Tonnes Truck"],
  ["KCZ 236N", "7 Tonnes Truck"],
  ["KBY 737G", "7 Tonnes Truck"],
  ["KDU 864J", "7 Tonnes Truck"],
  ["KDA 047Y", "7 Tonnes Truck"],
  ["KAZ 615V", "7 Tonnes Truck"],
  ["KCD 315J", "7 Tonnes Truck"],
  ["KDA 847D", "7 Tonnes Truck"],
  ["KBU 921A", "7 Tonnes Truck"],
  ["KCD 558K", "4 Tonnes Truck (Canter)"],
  ["KBB 856G", "4 Tonnes Truck (Canter)"],
  ["KBD 199U", "4 Tonnes Truck (Canter)"],
  ["KBD 624P", "4 Tonnes Truck (Canter)"],
  ["KBN 641F", "4 Tonnes Truck (Canter)"],
  ["KBW 605H", "4 Tonnes Truck (Canter)"],
  ["KBH 208C", "4 Tonnes Truck (Canter)"],
  ["KCR 225A", "4 Tonnes Truck (Canter)"],
  ["KCR 255A", "4 Tonnes Truck (Canter)"],
  ["KBT 301M", "4 Tonnes Truck (Canter)"],
  ["KBY 144Z", "4 Tonnes Truck (Canter)"],
  ["KCH 262K", "4 Tonnes Truck (Canter)"],
  ["KBM 462Y", "4 Tonnes Truck (Canter)"],
  ["KAX 442P", "4 Tonnes Truck (Canter)"],
  ["KCP 055Z", "4 Tonnes Truck (Canter)"],
  ["KAS 916K", "4 Tonnes Truck (Canter)"],
  ["KBZ 525U", "4 Tonnes Truck (Canter)"],
  ["KCE 884W", "4 Tonnes Truck (Canter)"],
  ["KBT 885R", "4 Tonnes Truck (Canter)"],
  ["KBH 006V", "4 Tonnes Truck (Canter)"],
  ["KDW 189R", "1 Tonne Truck (Van)"],
  ["KDR 415T", "1 Tonne Truck (Van)"],
  ["KDJ 651W", "1 Tonne Truck (Van)"],
  ["KCV 401H", "1 Tonne Truck (Van)"],
  ["KDU 114F", "1 Tonne Truck (Van)"],
  ["KBV 985N", "7 Tonnes Truck"],
];

export const RNTL_FLEET_LIST: FleetRow[] = RAW.map(([plate, label]) => ({
  plate: plate.trim().toUpperCase(),
  cls: clsFromLabel(label),
}));
