import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { getStore, persistStore } from "@/lib/data-store";
import { processWorkTicketStatusChange } from "@/lib/workflows";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { clientNote?: string };

  if (backendEnabled()) {
    const res = await backendRequest(
      req,
      `/work-tickets/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ clientNote: body.clientNote }),
      },
    );
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  const before = getStore().workTickets.get(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status !== "sent") {
    return NextResponse.json({ error: "Only sent work tickets can be approved" }, { status: 400 });
  }

  const updated = getStore().workTickets.update(id, {
    status: "approved",
    clientNote: body.clientNote?.trim() || undefined,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  processWorkTicketStatusChange(before, updated);
  persistStore();
  return NextResponse.json(updated);
}
