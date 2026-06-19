import { Injectable } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

@Injectable()
export class ReportsService {
  constructor(private readonly db: TenantDatabaseService) {}

  overview(month?: string) {
    const monthFilter = month ? `AND to_char(created_at, 'YYYY-MM') = $1` : "";
    const params = month ? [month] : [];
    return this.db.queryOne(
      `SELECT
         COALESCE(SUM(total), 0)::float AS revenue,
         COALESCE(SUM(vat), 0)::float AS vat_total,
         COUNT(*)::int AS invoice_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
       FROM invoices
       WHERE status NOT IN ('draft', 'rejected') ${monthFilter}`,
      params,
    );
  }

  fleetRanking(month?: string) {
    const monthFilter = month ? `AND to_char(created_at, 'YYYY-MM') = $1` : "";
    const params = month ? [month] : [];
    return this.db.queryAll(
      `SELECT plate, SUM(total)::float AS revenue, COUNT(*)::int AS trips
       FROM invoices
       WHERE status NOT IN ('draft', 'rejected') ${monthFilter}
       GROUP BY plate
       ORDER BY revenue DESC`,
      params,
    );
  }

  destinations(month?: string) {
    const monthFilter = month ? `AND to_char(created_at, 'YYYY-MM') = $1` : "";
    const params = month ? [month] : [];
    return this.db.queryAll(
      `SELECT route AS destination, SUM(total)::float AS revenue, COUNT(*)::int AS trips
       FROM invoices
       WHERE status NOT IN ('draft', 'rejected') ${monthFilter}
       GROUP BY route
       ORDER BY revenue DESC`,
      params,
    );
  }

  vatSummary(month?: string) {
    const monthFilter = month ? `AND to_char(created_at, 'YYYY-MM') = $1` : "";
    const params = month ? [month] : [];
    return this.db.queryAll(
      `SELECT to_char(created_at, 'YYYY-MM') AS period,
              SUM(net)::float AS net,
              SUM(vat)::float AS vat,
              SUM(total)::float AS gross
       FROM invoices
       WHERE status NOT IN ('draft', 'rejected') ${monthFilter}
       GROUP BY 1
       ORDER BY 1 DESC`,
      params,
    );
  }

  async pnl(month?: string) {
    const revMonthFilter = month ? `AND to_char(created_at, 'YYYY-MM') = $1` : "";
    const expMonthFilter = month ? `WHERE month = to_char(to_date($1, 'YYYY-MM'), 'Mon YYYY')` : "";
    const params = month ? [month] : [];

    const revenueRow = await this.db.queryOne<{ revenue: number; net: number; vat: number }>(
      `SELECT
         COALESCE(SUM(total), 0)::float AS revenue,
         COALESCE(SUM(net), 0)::float AS net,
         COALESCE(SUM(vat), 0)::float AS vat
       FROM invoices
       WHERE status NOT IN ('draft', 'rejected') ${revMonthFilter}`,
      params,
    );

    const expenses = await this.db.queryAll<{ category: string; amount: number }>(
      `SELECT category, COALESCE(SUM(amount), 0)::float AS amount
       FROM expenses
       ${expMonthFilter}
       GROUP BY category
       ORDER BY amount DESC`,
      params,
    );

    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netRevenue = Number(revenueRow?.net ?? 0);
    const grossProfit = netRevenue - expenseTotal;
    const marginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return {
      revenue: Number(revenueRow?.revenue ?? 0),
      netRevenue,
      vat: Number(revenueRow?.vat ?? 0),
      expenses: expenseTotal,
      grossProfit,
      marginPct,
      byCategory: expenses,
    };
  }
}
