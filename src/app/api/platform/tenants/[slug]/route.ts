import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, platformRequest } from "@/lib/backend-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  const { slug } = await params;
  const res = await platformRequest(req, `/platform/tenants/${encodeURIComponent(slug)}`);
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
