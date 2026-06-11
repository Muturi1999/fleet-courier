import fs from "fs";
import path from "path";
import type { FleetData } from "./types";

const SERVERLESS_PATH = "/tmp/fleet-store.json";

function storePath(): string {
  if (process.env.VERCEL) return SERVERLESS_PATH;
  return path.join(process.cwd(), ".data", "fleet-store.json");
}

export function loadPersistedStore(): FleetData | null {
  try {
    const file = storePath();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw) as FleetData;
    if (!data.schedules || !data.invoices) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePersistedStore(data: FleetData): void {
  try {
    const file = storePath();
    if (!process.env.VERCEL) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("[fleet-store] persist failed:", err);
  }
}
