import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json({ total: 0, draft: 0, sent: 0, pending: 0, approved: 0, paid: 0, rejected: 0 });
  }
  const res = await backendRequest(req, "/invoices/summary");
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
