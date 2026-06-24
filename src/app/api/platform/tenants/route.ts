import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, platformRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  const res = await platformRequest(req, "/platform/tenants");
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
