import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("invoiceId");
  if (!id) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  if (!backendEnabled()) {
    return NextResponse.json({ error: "Backend required for eTIMS preview" }, { status: 503 });
  }

  const res = await backendRequest(req, `/etims/invoices/${id}/preview`, { method: "GET" }, "admin");
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
