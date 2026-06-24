import { downloadCsv } from "./export-csv";
import { VEHICLE_IMPORT_HEADERS, VEHICLE_TEMPLATE_ROWS } from "./vehicle-fleet";

export function downloadVehicleTemplateCsv(filename = "vehicle-import-template") {
  downloadCsv(filename, [...VEHICLE_IMPORT_HEADERS], VEHICLE_TEMPLATE_ROWS);
}

export async function downloadVehicleTemplateXls(filename = "vehicle-import-template.xls") {
  const XLSX = await import("xlsx");
  const rows = [[...VEHICLE_IMPORT_HEADERS], ...VEHICLE_TEMPLATE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fleet");
  const out = XLSX.write(wb, { bookType: "xls", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadVehicleListCsv(
  filename: string,
  rows: [number, string, string][],
) {
  downloadCsv(filename, [...VEHICLE_IMPORT_HEADERS], rows);
}

export async function downloadVehicleListXls(
  filename: string,
  rows: [number, string, string][],
) {
  const XLSX = await import("xlsx");
  const sheetRows = [[...VEHICLE_IMPORT_HEADERS], ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fleet");
  const out = XLSX.write(wb, { bookType: "xls", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
