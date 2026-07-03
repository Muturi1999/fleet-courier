import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json({ schedules: [], workOrders: [] });
  try {
    const [schedules, workOrders] = await Promise.all([
      backendRequest(req, "/maintenance/schedules"),
      backendRequest(req, "/maintenance/work-orders"),
    ]);
    return NextResponse.json({
      schedules: await schedules.json(),
      workOrders: await workOrders.json(),
    });
  } catch (e) {
    return backendErrorResponse(e);
  }
}
