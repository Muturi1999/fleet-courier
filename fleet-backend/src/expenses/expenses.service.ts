import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(month?: string, category?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (month?.trim()) {
      clauses.push(`month = $${i++}`);
      params.push(month);
    }
    if (category?.trim()) {
      clauses.push(`category = $${i++}`);
      params.push(category);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db.queryAll(`SELECT * FROM expenses ${where} ORDER BY expense_date DESC, created_at DESC`, params);
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
