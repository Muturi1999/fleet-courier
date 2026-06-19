import { NextRequest, NextResponse } from "next/server";
import { backendEnabled, backendRequest } from "@/lib/backend-client";
import { computePnL } from "@/lib/reports";
import { getCollection } from "@/lib/data-store";
import type { Expense } from "@/lib/types";
import type { ReportMonthKey } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const month = (req.nextUrl.searchParams.get("month") ?? "2026-03") as ReportMonthKey;

  if (backendEnabled()) {
    const res = await backendRequest(req, `/reports/pnl?month=${encodeURIComponent(month)}`);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  }

  const expenses = getCollection("expenses").all() as Expense[];
  return NextResponse.json(computePnL(expenses, month));
}
