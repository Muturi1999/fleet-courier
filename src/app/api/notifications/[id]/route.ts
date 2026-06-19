import { NextRequest, NextResponse } from "next/server";
import { jsonUpdate } from "@/lib/api-helpers";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import type { WorkflowNotification } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  if (backendEnabled()) {
    const res = await backendRequest(req, `/notifications/${id}/read`, { method: "PATCH" });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  return jsonUpdate<WorkflowNotification>("notifications", id, await req.json());
}
