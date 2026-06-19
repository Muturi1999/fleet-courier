import { NextRequest, NextResponse } from "next/server";
import { getBillingProfile, setBillingProfile } from "@/lib/data-store";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import type { BillingProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (backendEnabled()) {
    const res = await backendRequest(req, "/billing-profile", undefined, "admin");
    const json = await res.json();
    return NextResponse.json(json, { status: res.status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(getBillingProfile(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as BillingProfile;

  if (backendEnabled()) {
    const res = await backendRequest(req, "/billing-profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }, "admin");
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  if (!body?.supplier?.pin || !body?.client?.pin) {
    return NextResponse.json({ error: "Supplier and client KRA PIN are required" }, { status: 400 });
  }
  return NextResponse.json(setBillingProfile(body));
}
