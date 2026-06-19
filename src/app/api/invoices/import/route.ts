import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function POST(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ error: "Import requires backend API" }, { status: 503 });
  }
  const body = await req.json();
  const res = await backendRequest(req, "/invoices/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
