import { Injectable, NotFoundException } from "@nestjs/common";
import {
  addDateClause,
  addSearchClause,
  wantsFullList,
} from "../common/database/list-query.helper";
import { queryList } from "../common/database/pagination.helper";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(query: ListQueryDto) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (query.month?.trim()) {
      clauses.push(`month = $${i++}`);
      params.push(query.month);
    }
    if (query.category?.trim()) {
      clauses.push(`category = $${i++}`);
      params.push(query.category);
    }
    i = addDateClause(clauses, params, i, "expense_date", query.date);
    i = addSearchClause(clauses, params, i, ["description", "category", "vehicle_plate"], query.search);

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (wantsFullList(query)) {
      return this.db.queryAll(
        `SELECT * FROM expenses ${where} ORDER BY expense_date DESC, created_at DESC, id DESC`,
        params,
      );
    }

    return queryList(this.db, query, {
      table: "expenses",
      where,
      params,
      orderBy: "expense_date DESC, created_at DESC, id DESC",
      timeColumn: "expense_date",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  async summary(month?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (month?.trim()) {
      clauses.push(`month = $1`);
      params.push(month);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const row = await this.db.queryOne<{
      count: string;
      total: string;
      all_total: string;
    }>(
      `SELECT
         COUNT(*)::text AS count,
         COALESCE(SUM(amount), 0)::text AS total,
         (SELECT COALESCE(SUM(amount), 0)::text FROM expenses) AS all_total
       FROM expenses ${where}`,
      params,
    );
    return {
      count: parseInt(row?.count ?? "0", 10),
      monthTotal: parseFloat(row?.total ?? "0"),
      allTotal: parseFloat(row?.all_total ?? "0"),
    };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM expenses WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Expense not found");
    return row;
  }

  create(dto: CreateExpenseDto) {
    return this.db.queryOne(
      `INSERT INTO expenses (expense_date, category, description, amount, vehicle_plate, month, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        dto.date,
        dto.category,
        dto.description,
        dto.amount,
        dto.vehiclePlate ?? null,
        dto.month,
        dto.status ?? "recorded",
      ],
    );
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      date: "expense_date",
      category: "category",
      description: "description",
      amount: "amount",
      vehiclePlate: "vehicle_plate",
      month: "month",
      status: "status",
    };

    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    fields.push("updated_at = NOW()");
    values.push(id);

    return this.db.queryOne(
      `UPDATE expenses SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return { ok: true };
  }
}
