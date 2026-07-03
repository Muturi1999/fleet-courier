import { NextRequest, NextResponse } from "next/server";
import { proxyCreate, proxyGetList } from "@/lib/api-proxy";

const RESOURCE = "clients/orders";

export async function GET(req: NextRequest) {
  const proxied = await proxyGetList(req, RESOURCE);
  if (proxied) return proxied;
  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const proxied = await proxyCreate(req, RESOURCE, body);
  if (proxied) return proxied;
  return NextResponse.json({ error: "Backend required" }, { status: 503 });
}
