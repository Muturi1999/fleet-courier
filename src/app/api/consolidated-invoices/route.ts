import { NextRequest, NextResponse } from "next/server";
import { jsonList } from "@/lib/api-helpers";
import { createConsolidatedInvoice, listUnbilledTickets } from "@/lib/consolidation-service";
import type { ConsolidatedInvoice } from "@/lib/types";

export async function GET(req: NextRequest) {
  const unbilled = req.nextUrl.searchParams.get("unbilled");
  if (unbilled === "true") {
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    return NextResponse.json(listUnbilledTickets(from, to));
  }
  return jsonList<ConsolidatedInvoice>("consolidatedInvoices");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invoice = createConsolidatedInvoice(body);
    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}
