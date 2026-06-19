import { NextResponse } from "next/server";
import { backendEnabled, backendUrl } from "@/lib/backend-client";

export async function GET() {
  const backend = backendEnabled();
  let backendOk = false;

  if (backend) {
    try {
      const res = await fetch(`${backendUrl()}/health`, { cache: "no-store" });
      backendOk = res.ok;
    } catch {
      backendOk = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    mode: backend ? "backend" : "local",
    backend: backend ? { url: backendUrl(), healthy: backendOk } : null,
    timestamp: new Date().toISOString(),
  });
}
