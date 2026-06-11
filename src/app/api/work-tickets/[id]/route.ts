import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import { getStore, persistStore } from "@/lib/data-store";
import { processWorkTicketStatusChange } from "@/lib/workflows";
import type { WorkTicket } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  return jsonGet<WorkTicket>("workTickets", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = (await req.json()) as Partial<WorkTicket>;
  const before = getStore().workTickets.get(id);
  const updated = getStore().workTickets.update(id, body);
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  processWorkTicketStatusChange(before, updated);
  persistStore();
  return Response.json(updated);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  return jsonDelete("workTickets", (await ctx.params).id);
}
