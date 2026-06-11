import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import type { WorkTicket } from "@/lib/types";

export async function GET() {
  return jsonList<WorkTicket>("workTickets");
}

export async function POST(req: NextRequest) {
  return jsonCreate<WorkTicket>("workTickets", await req.json());
}
