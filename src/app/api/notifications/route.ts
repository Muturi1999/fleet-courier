import { NextRequest, NextResponse } from "next/server";
import { getStore, persistStore } from "@/lib/data-store";
import type { NotificationAudience, WorkflowNotification } from "@/lib/types";

export async function GET(req: NextRequest) {
  const audience = req.nextUrl.searchParams.get("audience") as NotificationAudience | null;
  let items = getStore().notifications.all();
  if (audience === "admin" || audience === "client") {
    items = items.filter((n) => n.audience === audience);
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { action: string; audience?: NotificationAudience };
  if (body.action === "mark_all_read" && body.audience) {
    const store = getStore().notifications;
    store.all()
      .filter((n) => n.audience === body.audience && !n.read)
      .forEach((n) => store.update(n.id, { read: true }));
    persistStore();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
