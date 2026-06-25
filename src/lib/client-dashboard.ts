export type ClientDashboardDailyPoint = {
  day: string;
  label: string;
  invoicesReceived: number;
  invoicesApproved: number;
  approvedTotal: number;
  ticketsApproved: number;
};

export type ClientDashboardClassRow = {
  cls: string;
  count: number;
  total: number;
};

export type ClientDashboardActivity = {
  kind: "invoice" | "work_ticket";
  id: string;
  refNo: string;
  plate: string;
  route: string;
  status: string;
  eventDate: string;
  updatedAt: string;
};

export type ClientDashboardData = {
  month: string;
  monthLabel: string;
  updatedAt: string;
  invoices: {
    awaiting: number;
    approved: number;
    rejected: number;
    paid: number;
    totalCount: number;
    totalValue: number;
    net: number;
    vat: number;
  };
  workTickets: {
    awaiting: number;
    approved: number;
    rejected: number;
    totalCount: number;
    totalValue: number;
  };
  dailyTrend: ClientDashboardDailyPoint[];
  byClass: ClientDashboardClassRow[];
  recentActivity: ClientDashboardActivity[];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function mapClientDashboard(json: Record<string, unknown>): ClientDashboardData {
  const inv = (json.invoices ?? {}) as Record<string, unknown>;
  const wt = (json.workTickets ?? {}) as Record<string, unknown>;
  const trend = Array.isArray(json.dailyTrend) ? json.dailyTrend : [];
  const byClass = Array.isArray(json.byClass) ? json.byClass : [];
  const activity = Array.isArray(json.recentActivity) ? json.recentActivity : [];

  return {
    month: str(json.month),
    monthLabel: str(json.monthLabel),
    updatedAt: str(json.updatedAt),
    invoices: {
      awaiting: num(inv.awaiting),
      approved: num(inv.approved),
      rejected: num(inv.rejected),
      paid: num(inv.paid),
      totalCount: num(inv.totalCount ?? inv.total_count),
      totalValue: num(inv.totalValue ?? inv.total_value),
      net: num(inv.net),
      vat: num(inv.vat),
    },
    workTickets: {
      awaiting: num(wt.awaiting),
      approved: num(wt.approved),
      rejected: num(wt.rejected),
      totalCount: num(wt.totalCount ?? wt.total_count),
      totalValue: num(wt.totalValue ?? wt.total_value),
    },
    dailyTrend: trend.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        day: str(r.day),
        label: str(r.label),
        invoicesReceived: num(r.invoicesReceived ?? r.invoices_received),
        invoicesApproved: num(r.invoicesApproved ?? r.invoices_approved),
        approvedTotal: num(r.approvedTotal ?? r.approved_total),
        ticketsApproved: num(r.ticketsApproved ?? r.tickets_approved),
      };
    }),
    byClass: byClass.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        cls: str(r.cls) || "—",
        count: num(r.count),
        total: num(r.total),
      };
    }),
    recentActivity: activity.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        kind: str(r.kind) === "work_ticket" ? "work_ticket" : "invoice",
        id: str(r.id),
        refNo: str(r.refNo ?? r.ref_no),
        plate: str(r.plate),
        route: str(r.route),
        status: str(r.status),
        eventDate: str(r.eventDate ?? r.event_date),
        updatedAt: str(r.updatedAt ?? r.updated_at),
      };
    }),
  };
}
