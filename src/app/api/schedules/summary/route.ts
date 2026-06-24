import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json({ count: 0, days: 0, cost: 0, draft: 0 });
  }
  const res = await backendRequest(req, "/schedules/summary");
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
