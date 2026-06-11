import { NextResponse } from "next/server";
import { getCollection, persistStore, type StoreCollection } from "./data-store";

export type IdEntity = { id: string };

export function jsonList<T>(key: StoreCollection) {
  const col = getCollection(key) as unknown as { all: () => T[] };
  return NextResponse.json(col.all(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function jsonCreate<T extends IdEntity>(
  key: StoreCollection,
  body: Omit<T, "id">,
) {
  const col = getCollection(key) as unknown as { create: (d: Omit<T, "id">) => T };
  const item = col.create(body);
  persistStore();
  return NextResponse.json(item, { status: 201 });
}

export function jsonGet<T>(key: StoreCollection, id: string) {
  const col = getCollection(key) as unknown as { get: (id: string) => T | undefined };
  const item = col.get(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function jsonUpdate<T extends IdEntity>(
  key: StoreCollection,
  id: string,
  body: Partial<T>,
) {
  const col = getCollection(key) as unknown as { update: (id: string, p: Partial<T>) => T | null };
  const item = col.update(id, body);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  persistStore();
  return NextResponse.json(item);
}

export function jsonDelete(key: StoreCollection, id: string) {
  const col = getCollection(key) as unknown as { remove: (id: string) => boolean };
  if (!col.remove(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  persistStore();
  return NextResponse.json({ ok: true });
}
