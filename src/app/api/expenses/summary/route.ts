import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json({ count: 0, monthTotal: 0, allTotal: 0 });
  }
  const month = req.nextUrl.searchParams.get("month");
  const path = month ? `/expenses/summary?month=${encodeURIComponent(month)}` : "/expenses/summary";
  const res = await backendRequest(req, path);
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
