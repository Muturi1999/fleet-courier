import { NextRequest, NextResponse } from "next/server";
import { proxyDelete, proxyGetOne, proxyUpdate } from "@/lib/api-proxy";

const RESOURCE = "orders";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyGetOne(req, RESOURCE, id);
  if (proxied) return proxied;
  return NextResponse.json({ error: "Backend required" }, { status: 503 });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const proxied = await proxyUpdate(req, RESOURCE, id, body);
  if (proxied) return proxied;
  return NextResponse.json({ error: "Backend required" }, { status: 503 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyDelete(req, RESOURCE, id);
  if (proxied) return proxied;
  return NextResponse.json({ error: "Backend required" }, { status: 503 });
}
