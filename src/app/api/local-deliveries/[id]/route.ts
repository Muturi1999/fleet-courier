import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import type { LocalDelivery } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  return jsonGet<LocalDelivery>("localDeliveries", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const body = (await req.json()) as Partial<LocalDelivery>;
  if (body.m !== undefined || body.a !== undefined) {
    const m = body.m ?? 0;
    const a = body.a ?? 0;
    body.total = m + a;
  }
  return jsonUpdate<LocalDelivery>("localDeliveries", (await ctx.params).id, body);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  return jsonDelete("localDeliveries", (await ctx.params).id);
}
