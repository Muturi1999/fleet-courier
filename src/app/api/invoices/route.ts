import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { Invoice } from "@/lib/types";

export async function GET() {
  return jsonList<Invoice>("invoices");
}

export async function POST(req: NextRequest) {
  return jsonCreate<Invoice>("invoices", await req.json());
}
