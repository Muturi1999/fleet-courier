import { Injectable, NotFoundException } from "@nestjs/common";
import {
  addBillingMonthClause,
  addDestinationClause,
  addRunTypeClause,
  addSearchClause,
  addStatusClause,
  wantsFullList,
} from "../common/database/list-query.helper";
import { bulkInsert } from "../common/database/bulk-import.helper";
import { queryList } from "../common/database/pagination.helper";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";
import { buildScheduleExportWorkbook, buildScheduleExportSheet, type ScheduleExportRow } from "./schedule-excel-export";

@Injectable()
export class SchedulesService {
  constructor(private readonly db: TenantDatabaseService) {}

  private buildListFilter(query: ListQueryDto): { where: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    i = addSearchClause(clauses, params, i, ["plate", "dest", "cls", "month"], query.search);
    i = addDestinationClause(clauses, params, i, "dest", query.destination);
    // Match exact day against period bounds, service date, or created_at
    if (query.date?.trim()) {
      clauses.push(
        `(
          (period_start IS NOT NULL AND period_end IS NOT NULL AND $${i}::date BETWEEN period_start AND period_end)
          OR COALESCE(service_date, created_at::date) = $${i}::date
        )`,
      );
      params.push(query.date.trim());
      i += 1;
    }
    i = addBillingMonthClause(clauses, params, i, query.month);
    i = addRunTypeClause(clauses, params, i, query.runType);
    i = addStatusClause(clauses, params, i, query.status);

    return {
      where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  findAll(query: ListQueryDto) {
    const { where, params } = this.buildListFilter(query);

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM schedules ${where} ORDER BY created_at DESC, id DESC`, params);
    }

    return queryList(this.db, query, {
      table: "schedules",
      where,
      params,
      orderBy: "created_at DESC, id DESC",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  /** Filtered schedule rows as .xlsx — grouped by plate, blank line between groups, grand total only. */
  async exportXlsx(query: ListQueryDto): Promise<Buffer> {
    const rows = await this.loadExportRows(query);
    return buildScheduleExportWorkbook(rows);
  }

  /** Same data as export, as JSON for on-screen preview. */
  async exportPreview(query: ListQueryDto) {
    const rows = await this.loadExportRows(query);
    return buildScheduleExportSheet(rows);
  }

  private async loadExportRows(query: ListQueryDto): Promise<ScheduleExportRow[]> {
    const { where, params } = this.buildListFilter(query);
    return (await this.db.queryAll(
      `SELECT * FROM schedules ${where}
       ORDER BY UPPER(TRIM(plate)) ASC,
                COALESCE(service_date, period_start, created_at::date) ASC NULLS LAST,
                created_at ASC,
                id ASC`,
      params,
    )) as ScheduleExportRow[];
  }

  async summary() {
    const row = await this.db.queryOne<{
      count: string;
      days: string;
      cost: string;
      draft: string;
    }>(
      `SELECT
         COUNT(*)::text AS count,
         COALESCE(SUM(days), 0)::text AS days,
         COALESCE(SUM(cost), 0)::text AS cost,
         COUNT(*) FILTER (WHERE status = 'draft')::text AS draft
       FROM schedules`,
    );
    return {
      count: parseInt(row?.count ?? "0", 10),
      days: parseInt(row?.days ?? "0", 10),
      cost: parseFloat(row?.cost ?? "0"),
      draft: parseInt(row?.draft ?? "0", 10),
    };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM schedules WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Schedule not found");
    return row;
  }

  async create(dto: CreateScheduleDto) {
    const row = await this.db.queryOne(
      `INSERT INTO schedules (
         plate, cls, dest, run_type, rate, days, cost, vat, total,
         month, period_start, period_end, service_date, status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        dto.plate ?? "",
        dto.cls ?? "",
        dto.dest ?? "",
        dto.runType ?? "Morning",
        dto.rate ?? 0,
        dto.days ?? 0,
        dto.cost ?? 0,
        dto.vat ?? 0,
        dto.total ?? 0,
        dto.month ?? null,
        dto.periodStart ?? null,
        dto.periodEnd ?? null,
        dto.serviceDate ?? null,
        dto.status ?? "saved",
      ],
    );
    return row;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      plate: "plate",
      cls: "cls",
      dest: "dest",
      runType: "run_type",
      rate: "rate",
      days: "days",
      cost: "cost",
      vat: "vat",
      total: "total",
      month: "month",
      periodStart: "period_start",
      periodEnd: "period_end",
      serviceDate: "service_date",
      status: "status",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);
    return this.db.queryOne(
      `UPDATE schedules SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM schedules WHERE id = $1`, [id]);
    return { ok: true };
  }

  async importBulk(rows: CreateScheduleDto[]) {
    if (!rows.length) return { imported: 0, rows: [] as unknown[] };

    const values = rows.map((dto) => [
      dto.plate ?? "",
      dto.cls ?? "",
      dto.dest ?? "",
      dto.runType ?? "Morning",
      dto.rate ?? 0,
      dto.days ?? 0,
      dto.cost ?? 0,
      dto.vat ?? 0,
      dto.total ?? 0,
      dto.month ?? null,
      dto.periodStart ?? null,
      dto.periodEnd ?? null,
      dto.serviceDate ?? null,
      dto.status ?? "saved",
    ]);

    const created = await bulkInsert(this.db, {
      table: "schedules",
      columns: [
        "plate",
        "cls",
        "dest",
        "run_type",
        "rate",
        "days",
        "cost",
        "vat",
        "total",
        "month",
        "period_start",
        "period_end",
        "service_date",
        "status",
      ],
      rows: values,
      chunkSize: 500,
    });

    return { imported: created.length, rows: created };
  }
}
