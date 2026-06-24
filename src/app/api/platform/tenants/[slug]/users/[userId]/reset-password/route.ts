import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, platformRequest } from "@/lib/backend-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  if (!backendEnabled()) return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  const { slug, userId } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await platformRequest(
    req,
    `/platform/tenants/${encodeURIComponent(slug)}/users/${encodeURIComponent(userId)}/reset-password`,
    { method: "POST", body: JSON.stringify(body) },
  );
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
