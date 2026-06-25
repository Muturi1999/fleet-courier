import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  const { invoiceId } = (await req.json()) as { invoiceId?: string };
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  if (!backendEnabled()) {
    return NextResponse.json({ error: "Backend required for eTIMS submission" }, { status: 503 });
  }

  const res = await backendRequest(req, `/etims/invoices/${invoiceId}/submit`, { method: "POST" }, "admin");
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
