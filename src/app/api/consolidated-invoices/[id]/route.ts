import { NextRequest, NextResponse } from "next/server";
import { jsonGet } from "@/lib/api-helpers";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import {
  approveConsolidated,
  getConsolidatedWithTickets,
  markConsolidatedPaid,
  sendConsolidatedToClient,
  updateConsolidatedInvoice,
} from "@/lib/consolidation-service";
import { localCollection, proxyGetOne } from "@/lib/api-proxy";
import type { ConsolidatedInvoice } from "@/lib/types";

const RESOURCE = "consolidated-invoices";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;

  if (backendEnabled()) {
    const proxied = await proxyGetOne(req, RESOURCE, id);
    if (proxied) return proxied;
  }

  if (req.nextUrl.searchParams.get("detail") === "full") {
    const data = getConsolidatedWithTickets(id);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(data);
  }
  return jsonGet<ConsolidatedInvoice>(localCollection(RESOURCE), id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = await req.json();

  if (backendEnabled()) {
    const res = await backendRequest(req, `/consolidated-invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  const updated = updateConsolidatedInvoice(id, body);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = (await req.json()) as { action: string; clientNote?: string };

  if (backendEnabled()) {
    const res = await backendRequest(req, `/consolidated-invoices/${id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  if (body.action === "send") {
    const inv = sendConsolidatedToClient(id);
    if (!inv) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(inv);
  }
  if (body.action === "approve") {
    const inv = approveConsolidated(id, body.clientNote);
    if (!inv) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(inv);
  }
  if (body.action === "mark_paid") {
    const inv = markConsolidatedPaid(id);
    if (!inv) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(inv);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
