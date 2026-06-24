import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

type WorkTicketRow = {
  id: string;
  serial_no: string;
  trip_date: string | Date;
  plate: string;
  route: string;
  net: string | number;
  vat: string | number;
  total: string | number;
  partner_id?: string | null;
};

@Injectable()
export class WorkTicketInvoiceService {
  constructor(private readonly db: TenantDatabaseService) {}

  private formatPeriod(tripDate: string | Date): string {
    const d = new Date(tripDate);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
  }

  private invoiceNoForSerial(serialNo: string): string {
    return `WT-${serialNo}`;
  }

  async resolveVehicleCls(plate: string, client?: PoolClient): Promise<string> {
    const run = client
      ? (sql: string, params: unknown[]) => client.query(sql, params).then((r) => r.rows[0] ?? null)
      : (sql: string, params: unknown[]) => this.db.queryOne(sql, params);

    const row = await run(`SELECT cls FROM vehicles WHERE plate = $1 LIMIT 1`, [plate]);
    return (row as { cls?: string } | null)?.cls ?? "7T";
  }

  async createForWorkTicket(ticket: WorkTicketRow, client?: PoolClient) {
    const existing = client
      ? await client
          .query(`SELECT id FROM invoices WHERE work_ticket_id = $1`, [ticket.id])
          .then((r) => r.rows[0])
      : await this.db.queryOne(`SELECT id FROM invoices WHERE work_ticket_id = $1`, [ticket.id]);
    if (existing) return existing;

    const cls = await this.resolveVehicleCls(ticket.plate, client);
    const tripDate =
      ticket.trip_date instanceof Date
        ? ticket.trip_date.toISOString().slice(0, 10)
        : String(ticket.trip_date).slice(0, 10);
    const invoiceNo = this.invoiceNoForSerial(ticket.serial_no);
    const period = this.formatPeriod(tripDate);
    const id = randomUUID();

    const sql = `INSERT INTO invoices (
      id, invoice_no, plate, cls, route, days, net, vat, total, status,
      service_date, period, delivery_note_no, work_ticket_id, partner_id
    ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,'draft',$9,$10,$11,$12,$13)
    RETURNING *`;

    const params = [
      id,
      invoiceNo,
      ticket.plate,
      cls,
      ticket.route,
      ticket.net,
      ticket.vat,
      ticket.total,
      tripDate,
      period,
      ticket.serial_no,
      ticket.id,
      ticket.partner_id ?? null,
    ];

    if (client) {
      const res = await client.query(sql, params);
      return res.rows[0];
    }
    return this.db.queryOne(sql, params);
  }

  async syncFromWorkTicket(ticket: WorkTicketRow, client?: PoolClient) {
    const sql = `UPDATE invoices SET
      plate = $2, route = $3, net = $4, vat = $5, total = $6,
      service_date = $7, period = $8, delivery_note_no = $9, updated_at = NOW()
      WHERE work_ticket_id = $1 AND consolidated_invoice_id IS NULL`;
    const tripDate =
      ticket.trip_date instanceof Date
        ? ticket.trip_date.toISOString().slice(0, 10)
        : String(ticket.trip_date).slice(0, 10);
    const params = [
      ticket.id,
      ticket.plate,
      ticket.route,
      ticket.net,
      ticket.vat,
      ticket.total,
      tripDate,
      this.formatPeriod(tripDate),
      ticket.serial_no,
    ];
    if (client) {
      await client.query(sql, params);
      return;
    }
    await this.db.query(sql, params);
  }

  async deleteForWorkTicket(workTicketId: string, client?: PoolClient) {
    const sql = `DELETE FROM invoices WHERE work_ticket_id = $1 AND consolidated_invoice_id IS NULL`;
    if (client) {
      await client.query(sql, [workTicketId]);
      return;
    }
    await this.db.query(sql, [workTicketId]);
  }
}
