import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { Rate } from "@/lib/types";

export async function GET() {
  return jsonList<Rate>("rates");
}

export async function POST(req: NextRequest) {
  return jsonCreate<Rate>("rates", await req.json());
}
