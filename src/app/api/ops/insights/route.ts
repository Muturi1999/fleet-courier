import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json([], { status: 503 });
  try {
    const res = await backendRequest(req, "/ops/insights");
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return backendErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend required" }, { status: 503 });
  try {
    const res = await backendRequest(req, "/ops/insights/refresh", { method: "POST", body: "{}" });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return backendErrorResponse(e);
  }
}
