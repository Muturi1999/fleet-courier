import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { ScheduleEntry } from "@/lib/types";

export async function GET() {
  return jsonList<ScheduleEntry>("schedules");
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<ScheduleEntry, "id">;
  return jsonCreate<ScheduleEntry>("schedules", body);
}
