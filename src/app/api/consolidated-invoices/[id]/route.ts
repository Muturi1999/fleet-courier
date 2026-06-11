import { NextRequest } from "next/server";
import { jsonGet } from "@/lib/api-helpers";
import {
  approveConsolidated,
  getConsolidatedWithTickets,
  markConsolidatedPaid,
  sendConsolidatedToClient,
  updateConsolidatedInvoice,
} from "@/lib/consolidation-service";
import type { ConsolidatedInvoice } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  if (req.nextUrl.searchParams.get("detail") === "full") {
    const data = getConsolidatedWithTickets(id);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(data);
  }
  return jsonGet<ConsolidatedInvoice>("consolidatedInvoices", id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = await req.json();
  const updated = updateConsolidatedInvoice(id, body);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = (await req.json()) as { action: string; clientNote?: string };

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
