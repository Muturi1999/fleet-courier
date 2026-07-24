import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json({ error: "Backend required" }, { status: 503 });
  }
  const res = await backendRequest(req, "/clients/invoices/latest-period");
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
