import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { SafariEntry } from "@/lib/types";

export async function GET() {
  return jsonList<SafariEntry>("safari");
}

export async function POST(req: NextRequest) {
  return jsonCreate<SafariEntry>("safari", await req.json());
}
