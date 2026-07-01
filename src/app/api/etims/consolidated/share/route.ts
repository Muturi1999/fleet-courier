import { NextRequest } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json({ error: "Backend required" }, { status: 503 });
  }
  try {
    const body = (await req.json()) as { consolidatedInvoiceId?: string };
    const id = body.consolidatedInvoiceId?.trim();
    if (!id) {
      return Response.json({ message: "consolidatedInvoiceId is required" }, { status: 400 });
    }
    const res = await backendRequest(req, `/etims/consolidated-invoices/${id}/share`, { method: "POST" });
    const json = await res.json();
    return Response.json(json, { status: res.status });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
