import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateRateDto, UpdateRateDto } from "./dto/rate.dto";

@Injectable()
export class RateCardsService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM rates WHERE LOWER(route) LIKE $1 ORDER BY route`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM rates ORDER BY route`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM rates WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Rate not found");
    return row;
  }

  create(dto: CreateRateDto) {
    return this.db.queryOne(
      `INSERT INTO rates (route, cls, rate, effective_from, status, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dto.route, dto.cls, dto.rate, dto.effectiveFrom, dto.status ?? "active", dto.category ?? "nairobi"],
    );
  }

  async update(id: string, dto: UpdateRateDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      route: "route",
      cls: "cls",
      rate: "rate",
      effectiveFrom: "effective_from",
      status: "status",
      category: "category",
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
      `UPDATE rates SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM rates WHERE id = $1`, [id]);
    return { ok: true };
  }
}
