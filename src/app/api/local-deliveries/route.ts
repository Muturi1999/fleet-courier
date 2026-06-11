import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { LocalDelivery } from "@/lib/types";

export async function GET() {
  return jsonList<LocalDelivery>("localDeliveries");
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<LocalDelivery, "id">;
  return jsonCreate<LocalDelivery>("localDeliveries", {
    ...body,
    total: body.m + body.a,
  });
}
