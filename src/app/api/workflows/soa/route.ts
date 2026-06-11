import { NextRequest, NextResponse } from "next/server";
import { emitSoaApproved, emitSoaSent } from "@/lib/workflows";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { action: "soa_sent" | "soa_approved" };
  if (body.action === "soa_sent") emitSoaSent();
  else if (body.action === "soa_approved") emitSoaApproved();
  else return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
