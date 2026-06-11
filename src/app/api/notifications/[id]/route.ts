import { NextRequest } from "next/server";
import { jsonUpdate } from "@/lib/api-helpers";
import type { WorkflowNotification } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  return jsonUpdate<WorkflowNotification>("notifications", (await ctx.params).id, await req.json());
}
