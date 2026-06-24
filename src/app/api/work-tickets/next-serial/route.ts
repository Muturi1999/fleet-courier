import { NextRequest } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return Response.json("WT-0001");
  }
  const res = await backendRequest(req, "/work-tickets/next-serial");
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return Response.json(json, { status: res.status });
  } catch {
    return new Response(text, { status: res.status, headers: { "Content-Type": "text/plain" } });
  }
}
