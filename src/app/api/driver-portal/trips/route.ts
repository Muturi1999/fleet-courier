import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json([], { status: 503 });
  try {
    const driverId = req.nextUrl.searchParams.get("driverId");
    const res = await backendRequest(req, `/driver-portal/trips?driverId=${encodeURIComponent(driverId ?? "")}`);
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return backendErrorResponse(e);
  }
}
