import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";

export async function GET(req: NextRequest) {
  if (!backendEnabled()) {
    return NextResponse.json({ error: "Export requires backend API" }, { status: 503 });
  }

  const query = req.nextUrl.search || "";
  const res = await backendRequest(req, `/schedules/export${query}`);

  if (!res.ok) {
    const text = await res.text();
    let body: unknown = { error: "Export failed" };
    try {
      body = text ? JSON.parse(text) : body;
    } catch {
      body = { error: text || "Export failed" };
    }
    return NextResponse.json(body, { status: res.status, headers: { "Cache-Control": "no-store" } });
  }

  const buf = await res.arrayBuffer();
  const disposition =
    res.headers.get("Content-Disposition") ?? 'attachment; filename="schedule-entries.xlsx"';
  const contentType =
    res.headers.get("Content-Type") ??
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
