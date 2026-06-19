import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendUrl } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json(
      { error: "Backend is required for onboarding. Set FLEET_BACKEND_URL." },
      { status: 503 },
    );
  }

  const body = await req.json();
  const res = await fetch(`${backendUrl()}/tenants/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
