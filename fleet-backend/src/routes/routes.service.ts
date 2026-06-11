import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateRouteDto, UpdateRouteDto } from "./dto/route.dto";

@Injectable()
export class RoutesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM routes WHERE LOWER(name) LIKE $1 ORDER BY name`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM routes ORDER BY name`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM routes WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Route not found");
    return row;
  }

  create(dto: CreateRouteDto) {
    return this.db.queryOne(
      `INSERT INTO routes (name, rate7, rate15, category, trips, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        dto.name,
        dto.rate7,
        dto.rate15,
        dto.category ?? "nairobi",
        dto.trips ?? 0,
        dto.total ?? 0,
        dto.status ?? "active",
      ],
    );
  }

  async update(id: string, dto: UpdateRouteDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      name: "name",
      rate7: "rate7",
      rate15: "rate15",
      category: "category",
      trips: "trips",
      total: "total",
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
      `UPDATE routes SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM routes WHERE id = $1`, [id]);
    return { ok: true };
  }
}
