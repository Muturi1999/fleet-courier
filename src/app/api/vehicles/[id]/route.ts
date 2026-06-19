import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import { localCollection, proxyDelete, proxyGetOne, proxyUpdate } from "@/lib/api-proxy";
import type { Vehicle } from "@/lib/types";

const RESOURCE = "vehicles";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyGetOne(req, RESOURCE, id);
  if (proxied) return proxied;
  return jsonGet<Vehicle>(localCollection(RESOURCE), id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const proxied = await proxyUpdate(req, RESOURCE, id, body);
  if (proxied) return proxied;
  return jsonUpdate<Vehicle>(localCollection(RESOURCE), id, body);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyDelete(req, RESOURCE, id);
  if (proxied) return proxied;
  return jsonDelete(localCollection(RESOURCE), id);
}
