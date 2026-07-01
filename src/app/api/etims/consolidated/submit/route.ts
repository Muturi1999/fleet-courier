import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  const { consolidatedInvoiceId } = (await req.json()) as { consolidatedInvoiceId?: string };
  if (!consolidatedInvoiceId) {
    return NextResponse.json({ error: "consolidatedInvoiceId required" }, { status: 400 });
  }

  if (!backendEnabled()) {
    return NextResponse.json({ error: "Backend required for eTIMS submission" }, { status: 503 });
  }

  const res = await backendRequest(
    req,
    `/etims/consolidated-invoices/${consolidatedInvoiceId}/submit`,
    { method: "POST" },
    "admin",
  );
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
