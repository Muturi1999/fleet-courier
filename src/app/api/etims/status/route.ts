import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ configured: false, connected: false, message: "Backend not configured" });
  }

  const res = await backendRequest(req, "/etims/status", { method: "GET" }, "admin");
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
