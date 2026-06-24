import { NextRequest, NextResponse } from "next/server";
import { getStore, persistStore } from "@/lib/data-store";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

export async function GET(req: NextRequest) {
  const audience = req.nextUrl.searchParams.get("audience") as NotificationAudience | null;

  if (backendEnabled()) {
    const qs = new URLSearchParams();
    const audience = req.nextUrl.searchParams.get("audience");
    if (audience) qs.set("audience", audience);
    const unread = req.nextUrl.searchParams.get("unread");
    if (unread) qs.set("unread", unread);
    if (req.nextUrl.searchParams.get("all") === "true") qs.set("all", "true");
    const res = await backendRequest(req, `/notifications${qs.size ? `?${qs}` : ""}`);
    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : json;
    return NextResponse.json(items, { status: res.status });
  }

  let items = getStore().notifications.all();
  if (audience === "admin" || audience === "client") {
    items = items.filter((n) => n.audience === audience);
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { action: string; audience?: NotificationAudience };

  if (backendEnabled()) {
    const res = await backendRequest(req, "/notifications", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  if (body.action === "mark_all_read" && body.audience) {
    const store = getStore().notifications;
    store
      .all()
      .filter((n) => n.audience === body.audience && !n.read)
      .forEach((n) => store.update(n.id, { read: true }));
    persistStore();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
