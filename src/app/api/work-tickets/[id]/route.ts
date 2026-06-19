import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import { backendEnabled } from "@/lib/backend-client";
import { getStore, persistStore } from "@/lib/data-store";
import { localCollection, proxyDelete, proxyGetOne, proxyUpdate } from "@/lib/api-proxy";
import { processWorkTicketStatusChange } from "@/lib/workflows";
import type { WorkTicket } from "@/lib/types";

const RESOURCE = "work-tickets";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyGetOne(req, RESOURCE, id);
  if (proxied) return proxied;
  return jsonGet<WorkTicket>(localCollection(RESOURCE), id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  if (backendEnabled()) {
    const proxied = await proxyUpdate(req, RESOURCE, id, body);
    if (proxied) return proxied;
  }

  const before = getStore().workTickets.get(id);
  const updated = getStore().workTickets.update(id, body);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  processWorkTicketStatusChange(before, updated);
  persistStore();
  return Response.json(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const proxied = await proxyDelete(req, RESOURCE, id);
  if (proxied) return proxied;
  return jsonDelete(localCollection(RESOURCE), id);
}
