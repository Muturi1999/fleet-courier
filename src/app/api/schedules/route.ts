import { NextRequest } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import { localCollection, proxyCreate, proxyGetList } from "@/lib/api-proxy";
import type { ScheduleEntry } from "@/lib/types";

const RESOURCE = "schedules";

export async function GET(req: NextRequest) {
  const proxied = await proxyGetList(req, RESOURCE);
  if (proxied) return proxied;
  return jsonList<ScheduleEntry>(localCollection(RESOURCE));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const proxied = await proxyCreate(req, RESOURCE, body);
  if (proxied) return proxied;
  return jsonCreate<ScheduleEntry>(localCollection(RESOURCE), body);
}
