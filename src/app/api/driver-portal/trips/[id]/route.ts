import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendErrorResponse, backendRequest } from "@/lib/backend-client";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend required" }, { status: 503 });
  const { id } = await ctx.params;
  const driverId = req.nextUrl.searchParams.get("driverId");
  try {
    const body = await req.json();
    const res = await backendRequest(req, `/driver-portal/trips/${id}?driverId=${encodeURIComponent(driverId ?? "")}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (e) {
    return backendErrorResponse(e);
  }
}
