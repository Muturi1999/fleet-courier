import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { getStore, persistStore } from "@/lib/data-store";
import { processWorkTicketStatusChange } from "@/lib/workflows";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  if (backendEnabled()) {
    const res = await backendRequest(req, `/work-tickets/${id}/share`, { method: "POST" });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  const before = getStore().workTickets.get(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status !== "draft") {
    return NextResponse.json({ error: "Only draft work tickets can be shared" }, { status: 400 });
  }

  const updated = getStore().workTickets.update(id, { status: "sent" });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  processWorkTicketStatusChange(before, updated);
  persistStore();
  return NextResponse.json(updated);
}
