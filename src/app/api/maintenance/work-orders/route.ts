import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend required" }, { status: 503 });
  try {
    const body = await req.json();
    const res = await backendRequest(req, "/maintenance/work-orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return backendErrorResponse(e);
  }
}
