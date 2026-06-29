import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  const body = await req.json();

  if (!backendEnabled()) {
    return NextResponse.json({ error: "Revise requires backend API" }, { status: 503 });
  }

  const res = await backendRequest(req, `/consolidated-invoices/${id}/revise`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
