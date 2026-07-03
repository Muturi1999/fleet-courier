import { Injectable } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

@Injectable()
export class OpsService {
  constructor(private readonly db: TenantDatabaseService) {}

  async analytics() {
    const [orders, delivered, vehicles, activeAssignments, fuelSpend, maintenanceCost, onTime] =
      await Promise.all([
        this.db.queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM transport_orders`),
        this.db.queryOne<{ count: string; revenue: string }>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(quoted_amount),0)::text AS revenue FROM transport_orders WHERE status = 'delivered'`,
        ),
        this.db.queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM vehicles WHERE status = 'active'`),
        this.db.queryOne<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM dispatch_assignments WHERE status NOT IN ('completed','reassigned')`,
        ),
        this.db.queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(cost),0)::text AS total FROM fuel_logs WHERE logged_at >= date_trunc('month', CURRENT_DATE)`,
        ),
        this.db.queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(total_cost),0)::text AS total FROM maintenance_work_orders WHERE status = 'closed' AND closed_at >= date_trunc('month', CURRENT_DATE)::date`,
        ),
        this.db.queryOne<{ pct: string }>(
          `SELECT CASE WHEN COUNT(*) = 0 THEN '0' ELSE
            ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND completed_at <= o.delivery_due_at) / COUNT(*), 1)::text
           END AS pct
           FROM dispatch_assignments d JOIN transport_orders o ON o.id = d.order_id WHERE d.status = 'completed'`,
        ),
      ]);

    const vehicleCount = parseInt(vehicles?.count ?? "0", 10);
    const activeCount = parseInt(activeAssignments?.count ?? "0", 10);
    const utilization = vehicleCount > 0 ? Math.round((activeCount / vehicleCount) * 100) : 0;

    return {
      ordersTotal: parseInt(orders?.count ?? "0", 10),
      deliveredCount: parseInt(delivered?.count ?? "0", 10),
      deliveredRevenue: parseFloat(delivered?.revenue ?? "0"),
      activeVehicles: vehicleCount,
      activeAssignments: activeCount,
      fleetUtilizationPct: utilization,
      fuelSpendMonth: parseFloat(fuelSpend?.total ?? "0"),
      maintenanceCostMonth: parseFloat(maintenanceCost?.total ?? "0"),
      onTimeDeliveryPct: parseFloat(onTime?.pct ?? "0"),
    };
  }

  async dispatchSuggestions(orderId: string) {
    const order = await this.db.queryOne(`SELECT * FROM transport_orders WHERE id = $1`, [orderId]);
    if (!order) return { suggestions: [] };

    const drivers = await this.db.queryAll<{ id: string; name: string; active_assignments: string }>(
      `SELECT d.id, d.name,
        (SELECT COUNT(*)::text FROM dispatch_assignments a WHERE a.driver_id = d.id AND a.status NOT IN ('completed','reassigned')) AS active_assignments
       FROM drivers d WHERE d.active = TRUE ORDER BY active_assignments ASC, d.name LIMIT 10`,
    );
    const vehicles = await this.db.queryAll<{ id: string; plate: string; cls: string }>(
      `SELECT id, plate, cls FROM vehicles WHERE status = 'active' ORDER BY total DESC LIMIT 10`,
    );

    const suggestions = drivers.slice(0, 3).map((driver, idx) => {
      const vehicle = vehicles[idx % vehicles.length];
      const load = parseInt(driver.active_assignments, 10);
      const score = Math.max(10, 100 - load * 15 - idx * 5);
      return {
        driverId: driver.id,
        driverName: driver.name,
        vehicleId: vehicle?.id,
        plate: vehicle?.plate,
        score,
        reason:
          load === 0
            ? "Available driver with no active trips"
            : `${load} active trip(s) — still best match by load`,
        etaMinutes: 30 + idx * 10,
      };
    });

    return { orderId, orderNo: order.order_no, suggestions };
  }

  async refreshInsights() {
    const created: unknown[] = [];

    const dueMaint = await this.db.queryAll(
      `SELECT * FROM maintenance_schedules WHERE active = TRUE AND next_due_at <= CURRENT_DATE + 14`,
    );
    for (const s of dueMaint) {
      const row = await this.db.queryOne(
        `INSERT INTO ops_insights (insight_type, entity_type, entity_id, title, message, score, payload)
         VALUES ('predictive_maintenance','schedule',$1,$2,$3,$4,$5) RETURNING *`,
        [
          s.id,
          `Service due: ${s.plate}`,
          `${s.service_type} due by ${s.next_due_at ?? "soon"}`,
          85,
          JSON.stringify(s),
        ],
      );
      created.push(row);
    }

    const fuelAnomalies = await this.db.queryAll(
      `SELECT plate, AVG(liters)::numeric(10,2) AS avg_liters, MAX(liters) AS max_liters
       FROM fuel_logs WHERE logged_at >= CURRENT_DATE - 30 GROUP BY plate HAVING MAX(liters) > AVG(liters) * 1.8`,
    );
    for (const f of fuelAnomalies) {
      const row = await this.db.queryOne(
        `INSERT INTO ops_insights (insight_type, entity_type, title, message, score, payload)
         VALUES ('fuel_anomaly','vehicle',$1,$2,75,$3) RETURNING *`,
        [
          `High fuel fill: ${f.plate}`,
          `Latest fill ${f.max_liters}L vs avg ${f.avg_liters}L — review for theft or leak`,
          JSON.stringify(f),
        ],
      );
      created.push(row);
    }

    const unprofitable = await this.db.queryAll(
      `SELECT route_hint, COUNT(*) AS trips, COALESCE(SUM(quoted_amount),0) AS revenue
       FROM transport_orders WHERE status = 'delivered' AND route_hint IS NOT NULL
       GROUP BY route_hint HAVING COALESCE(SUM(quoted_amount),0) < 5000 AND COUNT(*) >= 3`,
    );
    for (const r of unprofitable) {
      const row = await this.db.queryOne(
        `INSERT INTO ops_insights (insight_type, title, message, score, payload)
         VALUES ('route_margin','Low margin route',$1,60,$2) RETURNING *`,
        [
          `${r.route_hint}: ${r.trips} trips · KES ${r.revenue} total — review pricing`,
          JSON.stringify(r),
        ],
      );
      created.push(row);
    }

    return { created: created.length };
  }

  listInsights() {
    return this.db.queryAll(
      `SELECT * FROM ops_insights WHERE dismissed = FALSE ORDER BY score DESC NULLS LAST, created_at DESC LIMIT 50`,
    );
  }

  dismissInsight(id: string) {
    return this.db.queryOne(`UPDATE ops_insights SET dismissed = TRUE WHERE id = $1 RETURNING *`, [id]);
  }

  quoteShipment(input: { pickupAddress: string; deliveryAddress: string; weightKg?: number }) {
    const base = 3500;
    const perKg = 50;
    const distanceFactor = Math.min(
      3,
      1 + (input.pickupAddress.length + input.deliveryAddress.length) / 200,
    );
    const weight = input.weightKg ?? 0;
    const amount = Math.round((base + weight * perKg) * distanceFactor);
    const net = Math.round((amount / 1.16) * 100) / 100;
    return {
      quotedAmount: amount,
      net,
      vat: Math.round((amount - net) * 100) / 100,
      currency: "KES",
      validHours: 24,
      note: "Instant quote — final amount may adjust after dispatch",
    };
  }
}
