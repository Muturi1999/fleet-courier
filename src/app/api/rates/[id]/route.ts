import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { Rate } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  return jsonGet<Rate>("rates", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return jsonUpdate<Rate>("rates", (await ctx.params).id, await req.json());
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  return jsonDelete("rates", (await ctx.params).id);
}
