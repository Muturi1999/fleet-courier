/** RNTL fleet list column headers — matches "RNTL FLEET LIST" PDF */
export const VEHICLE_IMPORT_HEADERS = ["No.", "License Plate", "Vehicle Classification"] as const;

export type VehicleClassification = {
  cls: string;
  label: string;
};

/** PDF vehicle classification labels */
export const VEHICLE_CLASSIFICATIONS: VehicleClassification[] = [
  { cls: "15T", label: "15 Tonnes Truck" },
  { cls: "7T", label: "7 Tonnes Truck" },
  { cls: "Canter", label: "4 Tonnes Truck (Canter)" },
  { cls: "Van", label: "1 Tonne Truck (Van)" },
];

export function clsFromLabel(label: string): string {
  const t = label.trim().toLowerCase();
  if (t.includes("15 ton")) return "15T";
  if (t.includes("canter") || t.includes("4 ton")) return "Canter";
  if (t.includes("van") || t.includes("1 ton")) return "Van";
  if (t === "15t" || t === "15 t") return "15T";
  if (t === "7t" || t === "7 t") return "7T";
  if (t === "canter") return "Canter";
  if (t === "van") return "Van";
  return "7T";
}

export function labelFromCls(cls: string): string {
  const norm = normalizeCls(cls);
  return VEHICLE_CLASSIFICATIONS.find((c) => c.cls === norm)?.label ?? "7 Tonnes Truck";
}

export function normalizeCls(cls: string): string {
  const t = cls.trim().toUpperCase();
  if (t === "15T") return "15T";
  if (t === "7T") return "7T";
  if (t === "CANTER") return "Canter";
  if (t === "VAN") return "Van";
  if (cls === "Canter" || cls === "Van") return cls;
  return clsFromLabel(cls);
}

export function normalizePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, " ").toUpperCase();
}

export function formatPlateInput(raw: string): string {
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (compact.length <= 3) return compact;
  const series = compact.slice(0, 3);
  const rest = compact.slice(3);
  return rest ? `${series} ${rest}` : series;
}

/** Sample rows for import templates */
export const VEHICLE_TEMPLATE_ROWS: [number, string, string][] = [
  [1, "KBH 667W", "15 Tonnes Truck"],
  [2, "KDR 566W", "7 Tonnes Truck"],
  [3, "KCD 558K", "4 Tonnes Truck (Canter)"],
  [4, "KDW 189R", "1 Tonne Truck (Van)"],
];

export type VehicleImportRow = {
  plate: string;
  cls: string;
  runType?: string;
  status?: "active" | "inactive" | "suspended";
  client?: string;
};
