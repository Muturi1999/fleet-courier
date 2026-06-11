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
}
