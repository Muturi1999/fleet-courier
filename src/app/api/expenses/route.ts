import { NextRequest, NextResponse } from "next/server";
import { jsonCreate, jsonList } from "@/lib/api-helpers";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { emitSoaApproved, emitSoaSent } from "@/lib/workflows";
import { localCollection, proxyCreate, proxyGetList } from "@/lib/api-proxy";
import type { Expense } from "@/lib/types";

const RESOURCE = "expenses";

export async function GET(req: NextRequest) {
  const proxied = await proxyGetList(req, RESOURCE);
  if (proxied) return proxied;
  return jsonList<Expense>(localCollection(RESOURCE));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const proxied = await proxyCreate(req, RESOURCE, body);
  if (proxied) return proxied;
  return jsonCreate<Expense>(localCollection(RESOURCE), body);
}
