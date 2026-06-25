import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ enabled: false, message: "Backend not configured" });
  }
  try {
    const res = await backendRequest(req, "/etims/dashboard", { method: "GET" }, "admin");
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return backendErrorResponse(err);
  }
}
