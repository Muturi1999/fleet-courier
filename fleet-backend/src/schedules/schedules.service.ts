import { Injectable, NotFoundException } from "@nestjs/common";
import {
  addDateClause,
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

@Injectable()
export class SchedulesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(query: ListQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    i = addSearchClause(clauses, params, i, ["plate", "dest", "cls"], query.search);
    i = addDestinationClause(clauses, params, i, "dest", query.destination);
    i = addDateClause(clauses, params, i, "service_date", query.date);
    i = addRunTypeClause(clauses, params, i, query.runType);
    i = addStatusClause(clauses, params, i, query.status);

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

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
      `INSERT INTO schedules (plate, cls, dest, run_type, rate, days, cost, vat, total, month, service_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        dto.plate,
        dto.cls,
        dto.dest,
        dto.runType,
        dto.rate,
        dto.days,
        dto.cost,
        dto.vat,
        dto.total,
        dto.month ?? null,
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
      dto.plate,
      dto.cls,
      dto.dest,
      dto.runType,
      dto.rate,
      dto.days,
      dto.cost,
      dto.vat,
      dto.total,
      dto.month ?? null,
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
        "service_date",
        "status",
      ],
      rows: values,
      chunkSize: 500,
    });

    return { imported: created.length, rows: created };
  }
}
