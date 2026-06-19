import { NextResponse } from "next/server";
import { backendEnabled, backendUrl } from "@/lib/backend-client";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;

  if (!backendEnabled()) {
    return NextResponse.json({ slug, available: true });
  }

  const res = await fetch(`${backendUrl()}/tenants/slug-available/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
