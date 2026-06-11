import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { RouteRecord } from "@/lib/types";

export async function GET() {
  return jsonList<RouteRecord>("routes");
}

export async function POST(req: NextRequest) {
  return jsonCreate<RouteRecord>("routes", await req.json());
}
