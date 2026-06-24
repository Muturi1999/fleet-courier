import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json("17206");
  }
  const res = await backendRequest(req, "/invoices/next-number");
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
