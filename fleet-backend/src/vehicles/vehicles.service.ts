import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateVehicleDto, UpdateVehicleDto } from "./dto/vehicle.dto";
import { VehicleImportRowDto } from "./dto/vehicle-import.dto";
import { normalizeCls, normalizePlate } from "./vehicle-fleet.helper";
import { vehiclePlateConflict } from "./vehicle-messages";

@Injectable()
export class VehiclesService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM vehicles WHERE LOWER(plate) LIKE $1 ORDER BY created_at DESC`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM vehicles ORDER BY created_at DESC`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM vehicles WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Vehicle not found");
    return row;
  }

  async create(dto: CreateVehicleDto) {
    const plate = normalizePlate(dto.plate);
    const cls = normalizeCls(dto.cls);
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM vehicles WHERE REPLACE(LOWER(TRIM(plate)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '')`,
      [plate],
    );
    if (existing) {
      throw vehiclePlateConflict(plate);
    }
    const row = await this.db.queryOne(
      `INSERT INTO vehicles (plate, cls, run_type, runs, days, total, dests, status, client)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        plate,
        cls,
        dto.runType,
        dto.runs ?? 0,
        dto.days ?? 0,
        dto.total ?? 0,
        JSON.stringify(dto.dests ?? []),
        dto.status ?? "active",
        dto.client ?? null,
      ],
    );
    if (!row) throw new ConflictException(`Vehicle ${plate} could not be saved`);
    return row;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    if (dto.plate !== undefined) {
      const plate = normalizePlate(dto.plate);
      const existing = await this.db.queryOne<{ id: string }>(
        `SELECT id FROM vehicles WHERE REPLACE(LOWER(TRIM(plate)), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '') AND id <> $2`,
        [plate, id],
      );
      if (existing) throw vehiclePlateConflict(plate);
    }
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

  async importBulk(rows: VehicleImportRowDto[]) {
    if (!rows.length) return { imported: 0, inserted: 0, updated: 0, rows: [] as unknown[] };

    let inserted = 0;
    let updated = 0;
    const saved: unknown[] = [];

    for (const dto of rows) {
      const plate = normalizePlate(dto.plate);
      const cls = normalizeCls(dto.cls);
      const row = await this.db.queryOne<{ inserted: boolean } & Record<string, unknown>>(
        `INSERT INTO vehicles (plate, cls, run_type, runs, days, total, dests, status, client)
         VALUES ($1, $2, $3, 0, 0, 0, '[]'::jsonb, $4, $5)
         ON CONFLICT (plate) DO UPDATE SET
           cls = EXCLUDED.cls,
           run_type = EXCLUDED.run_type,
           status = EXCLUDED.status,
           client = COALESCE(EXCLUDED.client, vehicles.client),
           updated_at = NOW()
         RETURNING *, (xmax = 0) AS inserted`,
        [
          plate,
          cls,
          dto.runType ?? "Nairobi",
          dto.status ?? "active",
          dto.client ?? null,
        ],
      );
      if (row?.inserted) inserted++;
      else updated++;
      saved.push(row);
    }

    return { imported: rows.length, inserted, updated, rows: saved };
  }
}
