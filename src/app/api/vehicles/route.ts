import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { Vehicle } from "@/lib/types";

export async function GET() {
  return jsonList<Vehicle>("vehicles");
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<Vehicle, "id">;
  return jsonCreate<Vehicle>("vehicles", body);
}
