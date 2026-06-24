import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  if (!backendEnabled()) return Response.json({ error: "Backend required" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const res = await backendRequest(req, `/clients/invoices/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
