import { NextRequest, NextResponse } from "next/server";
import { backendEnabled } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend required" }, { status: 503 });
  const body = await req.json();
  const tenantSlug = req.headers.get("x-tenant-slug") ?? "horizon-logistics-ltd";
  const base = (process.env.FLEET_BACKEND_URL ?? "").replace(/\/+$/, "");
  const loginRes = await fetch(`${base}/driver-portal/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-slug": tenantSlug },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await loginRes.json();
  return NextResponse.json(json, { status: loginRes.status });
}
