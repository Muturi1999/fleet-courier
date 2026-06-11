import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { ScheduleEntry } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return jsonGet<ScheduleEntry>("schedules", id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<ScheduleEntry>;
  return jsonUpdate<ScheduleEntry>("schedules", id, body);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return jsonDelete("schedules", id);
}
