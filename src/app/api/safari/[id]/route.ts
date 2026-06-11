import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { SafariEntry } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  return jsonGet<SafariEntry>("safari", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return jsonUpdate<SafariEntry>("safari", (await ctx.params).id, await req.json());
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  return jsonDelete("safari", (await ctx.params).id);
}
