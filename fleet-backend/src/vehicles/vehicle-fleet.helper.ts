/** RNTL fleet list classification mapping — matches PDF labels */
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
