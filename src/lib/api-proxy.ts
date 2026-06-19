import { NextRequest, NextResponse } from "next/server";
import {
  jsonCreate,
  jsonDelete,
  jsonGet,
  jsonList,
  jsonUpdate,
} from "./api-helpers";
import { type StoreCollection } from "./data-store";
import { backendEnabled, backendRequest } from "./backend-client";

/** Frontend `/api/*` segment → NestJS path under `/api/v1` */
export const API_BACKEND_PATHS: Record<string, string> = {
  schedules: "/schedules",
  vehicles: "/vehicles",
  invoices: "/invoices",
  rates: "/rate-cards",
  "local-deliveries": "/deliveries/local",
  safari: "/deliveries/safari",
  routes: "/routes",
  "work-tickets": "/work-tickets",
  "consolidated-invoices": "/consolidated-invoices",
  notifications: "/notifications",
  expenses: "/expenses",
  "billing-profile": "/billing-profile",
};

const LOCAL_COLLECTION: Record<string, StoreCollection> = {
  schedules: "schedules",
  vehicles: "vehicles",
  invoices: "invoices",
  rates: "rates",
  "local-deliveries": "localDeliveries",
  safari: "safari",
  routes: "routes",
  "work-tickets": "workTickets",
  "consolidated-invoices": "consolidatedInvoices",
  notifications: "notifications",
  expenses: "expenses",
};

function backendPath(resource: string, id?: string, query = ""): string {
  const base = API_BACKEND_PATHS[resource];
  if (!base) throw new Error(`No backend mapping for /api/${resource}`);
  return id ? `${base}/${id}${query}` : `${base}${query}`;
}

async function readBackend(res: Response) {
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { res, json };
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/** Unwrap `{ data, meta }` pagination envelopes for the UI hooks. */
function unwrapList(json: unknown): unknown {
  if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)) {
    return (json as { data: unknown }).data;
  }
  return json;
}

function normalizeExpense(row: Record<string, unknown>) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    date: row.date ?? row.expenseDate,
  };
}

function normalizeExpenses(json: unknown) {
  if (Array.isArray(json)) return json.map((r) => normalizeExpense(r as Record<string, unknown>));
  return json;
}

export async function proxyGetList(req: NextRequest, resource: string) {
  if (!backendEnabled()) return null;
  const query = req.nextUrl.search || "";
  const { res, json } = await readBackend(await backendRequest(req, backendPath(resource, undefined, query)));
  if (!res.ok) return jsonResponse(json, res.status);
  const body = resource === "expenses" ? normalizeExpenses(unwrapList(json)) : unwrapList(json);
  return jsonResponse(body, res.status);
}

export async function proxyGetOne(req: NextRequest, resource: string, id: string) {
  if (!backendEnabled()) return null;
  const query = req.nextUrl.search || "";
  const { res, json } = await readBackend(await backendRequest(req, backendPath(resource, id, query)));
  if (!res.ok) return jsonResponse(json, res.status);
  const body = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
  return jsonResponse(body, res.status);
}

export async function proxyCreate(req: NextRequest, resource: string, body: unknown) {
  if (!backendEnabled()) return null;
  const { res, json } = await readBackend(
    await backendRequest(req, backendPath(resource), { method: "POST", body: JSON.stringify(body) }),
  );
  if (!res.ok) return jsonResponse(json, res.status);
  const normalized = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
  return jsonResponse(normalized, res.status);
}

export async function proxyUpdate(req: NextRequest, resource: string, id: string, body: unknown) {
  if (!backendEnabled()) return null;
  const { res, json } = await readBackend(
    await backendRequest(req, backendPath(resource, id), { method: "PUT", body: JSON.stringify(body) }),
  );
  if (!res.ok) return jsonResponse(json, res.status);
  const normalized = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
  return jsonResponse(normalized, res.status);
}

export async function proxyDelete(req: NextRequest, resource: string, id: string) {
  if (!backendEnabled()) return null;
  const { res, json } = await readBackend(
    await backendRequest(req, backendPath(resource, id), { method: "DELETE" }),
  );
  return jsonResponse(json ?? { ok: true }, res.status);
}

export function localCollection(resource: string): StoreCollection {
  const key = LOCAL_COLLECTION[resource];
  if (!key) throw new Error(`No local store for /api/${resource}`);
  return key;
}
