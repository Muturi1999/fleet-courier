import { NextRequest } from "next/server";
import { jsonDelete, jsonGet, jsonUpdate } from "@/lib/api-helpers";
import { getStore, persistStore } from "@/lib/data-store";
import { processInvoiceStatusChange } from "@/lib/workflows";
import type { Invoice } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  return jsonGet<Invoice>("invoices", (await ctx.params).id);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = (await req.json()) as Partial<Invoice>;
  const before = getStore().invoices.get(id);
  const updated = getStore().invoices.update(id, body);
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  processInvoiceStatusChange(before, updated);
  persistStore();
  return Response.json(updated);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  return jsonDelete("invoices", (await ctx.params).id);
}
