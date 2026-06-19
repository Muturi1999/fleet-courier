import { NextRequest, NextResponse } from "next/server";
import { jsonList } from "@/lib/api-helpers";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { createConsolidatedInvoice, listUnbilledTickets } from "@/lib/consolidation-service";
import { localCollection, proxyCreate, proxyGetList } from "@/lib/api-proxy";
import type { ConsolidatedInvoice } from "@/lib/types";

const RESOURCE = "consolidated-invoices";

export async function GET(req: NextRequest) {
  if (backendEnabled()) {
    const proxied = await proxyGetList(req, RESOURCE);
    if (proxied) return proxied;
  }

  const unbilled = req.nextUrl.searchParams.get("unbilled");
  if (unbilled === "true") {
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    return NextResponse.json(listUnbilledTickets(from, to));
  }
  return jsonList<ConsolidatedInvoice>(localCollection(RESOURCE));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (backendEnabled()) {
    const proxied = await proxyCreate(req, RESOURCE, body);
    if (proxied) return proxied;
  }

  try {
    const invoice = createConsolidatedInvoice(body);
    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}
