import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { Vehicle } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return jsonGet<Vehicle>("vehicles", id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return jsonUpdate<Vehicle>("vehicles", id, await req.json());
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return jsonDelete("vehicles", id);
}
