import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { emitSoaApproved, emitSoaSent } from "@/lib/workflows";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { action: "soa_sent" | "soa_approved" };

  if (backendEnabled()) {
    const res = await backendRequest(req, "/workflows/soa", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  if (body.action === "soa_sent") emitSoaSent();
  else if (body.action === "soa_approved") emitSoaApproved();
  else return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
