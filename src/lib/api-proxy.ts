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
import { normalizeListJson } from "./list-query";

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
  "clients/invoices": "/clients/invoices",
  "clients/work-tickets": "/clients/work-tickets",
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

function proxyErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Backend unavailable";
  const status = message.includes("sign in") ? 401 : 503;
  return jsonResponse({ error: message }, status);
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

/** Normalize list responses — preserve pagination envelope when present */
function normalizeListBody(json: unknown, resource: string) {
  if (resource === "expenses") {
    if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)) {
      const env = json as { data: unknown[]; meta: unknown };
      return { data: normalizeExpenses(env.data), meta: env.meta };
    }
    return normalizeExpenses(json);
  }
  return normalizeListJson(json);
}

export async function proxyGetList(req: NextRequest, resource: string) {
  if (!backendEnabled()) return null;
  try {
    const query = req.nextUrl.search || "";
    const { res, json } = await readBackend(await backendRequest(req, backendPath(resource, undefined, query)));
    if (!res.ok) return jsonResponse(json, res.status);
    return jsonResponse(normalizeListBody(json, resource), res.status);
  } catch (err) {
    return proxyErrorResponse(err);
  }
}

export async function proxyGetOne(req: NextRequest, resource: string, id: string) {
  if (!backendEnabled()) return null;
  try {
    const query = req.nextUrl.search || "";
    const { res, json } = await readBackend(await backendRequest(req, backendPath(resource, id, query)));
    if (!res.ok) return jsonResponse(json, res.status);
    const body = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
    return jsonResponse(body, res.status);
  } catch (err) {
    return proxyErrorResponse(err);
  }
}

export async function proxyCreate(req: NextRequest, resource: string, body: unknown) {
  if (!backendEnabled()) return null;
  try {
    const { res, json } = await readBackend(
      await backendRequest(req, backendPath(resource), { method: "POST", body: JSON.stringify(body) }),
    );
    if (!res.ok) return jsonResponse(json, res.status);
    const normalized = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
    return jsonResponse(normalized, res.status);
  } catch (err) {
    return proxyErrorResponse(err);
  }
}

export async function proxyUpdate(req: NextRequest, resource: string, id: string, body: unknown) {
  if (!backendEnabled()) return null;
  try {
    const { res, json } = await readBackend(
      await backendRequest(req, backendPath(resource, id), { method: "PUT", body: JSON.stringify(body) }),
    );
    if (!res.ok) return jsonResponse(json, res.status);
    const normalized = resource === "expenses" ? normalizeExpense(json as Record<string, unknown>) : json;
    return jsonResponse(normalized, res.status);
  } catch (err) {
    return proxyErrorResponse(err);
  }
}

export async function proxyDelete(req: NextRequest, resource: string, id: string) {
  if (!backendEnabled()) return null;
  try {
    const { res, json } = await readBackend(
      await backendRequest(req, backendPath(resource, id), { method: "DELETE" }),
    );
    return jsonResponse(json ?? { ok: true }, res.status);
  } catch (err) {
    return proxyErrorResponse(err);
  }
}

export function localCollection(resource: string): StoreCollection {
  const key = LOCAL_COLLECTION[resource];
  if (!key) throw new Error(`No local store for /api/${resource}`);
  return key;
}
