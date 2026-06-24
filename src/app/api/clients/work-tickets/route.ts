import { NextRequest } from "next/server";
import { proxyGetList } from "@/lib/api-proxy";

export async function GET(req: NextRequest) {
  const proxied = await proxyGetList(req, "clients/work-tickets");
  if (proxied) return proxied;
  return Response.json({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
}
