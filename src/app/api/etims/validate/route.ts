import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { getBillingProfile, getCollection } from "@/lib/data-store";
import { validateInvoiceEtims } from "@/lib/etims";
import type { Invoice } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { invoiceId } = (await req.json()) as { invoiceId?: string };
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  if (backendEnabled()) {
    const res = await backendRequest(req, `/etims/invoices/${invoiceId}/validate`, { method: "POST" }, "admin");
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  const invoice = getCollection("invoices").get(invoiceId) as Invoice | undefined;
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(validateInvoiceEtims(invoice, getBillingProfile()));
}
