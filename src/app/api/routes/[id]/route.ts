import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { RouteRecord } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return jsonGet<RouteRecord>("routes", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return jsonUpdate<RouteRecord>("routes", (await ctx.params).id, await req.json());
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return jsonDelete("routes", (await ctx.params).id);
}
