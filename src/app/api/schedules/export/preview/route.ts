import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ error: "Export preview requires backend API" }, { status: 503 });
  }

  const query = req.nextUrl.search || "";
  const res = await backendRequest(req, `/schedules/export/preview${query}`);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || "Preview failed" };
  }
  return NextResponse.json(body, {
    status: res.status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
