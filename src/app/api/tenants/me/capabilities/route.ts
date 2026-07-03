import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ error: "Backend required" }, { status: 503 });
  }
  try {
    const res = await backendRequest(req, "/tenants/me/capabilities");
    const json = await res.json();
    return NextResponse.json(json, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
