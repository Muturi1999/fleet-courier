import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const id = (await ctx.params).id;
  if (!backendEnabled()) return Response.json({ error: "Not found" }, { status: 404 });
  const res = await backendRequest(req, `/clients/invoices/${id}`);
  const json = await res.json();
  return Response.json(json, { status: res.status });
}
