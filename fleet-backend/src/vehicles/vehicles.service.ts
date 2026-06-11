import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateVehicleDto, UpdateVehicleDto } from "./dto/vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM vehicles WHERE LOWER(plate) LIKE $1 ORDER BY plate`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM vehicles ORDER BY plate`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM vehicles WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Vehicle not found");
    return row;
  }

  create(dto: CreateVehicleDto) {
    return this.db.queryOne(
      `INSERT INTO vehicles (plate, cls, run_type, runs, days, total, dests, status, client)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dto.plate,
        dto.cls,
        dto.runType,
        dto.runs ?? 0,
        dto.days ?? 0,
        dto.total ?? 0,
        JSON.stringify(dto.dests ?? []),
        dto.status ?? "active",
        dto.client ?? null,
      ],
    );
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      plate: "plate",
      cls: "cls",
      runType: "run_type",
      runs: "runs",
      days: "days",
      total: "total",
      status: "status",
      client: "client",
    };
    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (dto.dests !== undefined) {
      fields.push(`dests = $${i++}`);
      values.push(JSON.stringify(dto.dests));
    }
    fields.push(`updated_at = NOW()`);
    values.push(id);
    return this.db.queryOne(
      `UPDATE vehicles SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM vehicles WHERE id = $1`, [id]);
    return { ok: true };
  }
}
