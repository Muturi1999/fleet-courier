import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { CreateDriverDto, UpdateDriverDto } from "./dto/driver.dto";

@Injectable()
export class DriversService {
  constructor(private readonly db: TenantDatabaseService) {}

  findAll(activeOnly = false) {
    const where = activeOnly ? "WHERE active = TRUE" : "";
    return this.db.queryAll(`SELECT * FROM drivers ${where} ORDER BY name`);
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM drivers WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Driver not found");
    return row;
  }

  create(dto: CreateDriverDto) {
    return this.db.queryOne(
      `INSERT INTO drivers (name, id_number, license_expiry, active, phone, portal_pin)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dto.name, dto.idNumber ?? null, dto.licenseExpiry ?? null, dto.active ?? true, dto.phone ?? null, dto.portalPin ?? null],
    );
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const map: Record<string, string> = {
      name: "name",
      idNumber: "id_number",
      licenseExpiry: "license_expiry",
      active: "active",
      phone: "phone",
      portalPin: "portal_pin",
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
      `UPDATE drivers SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query(`DELETE FROM drivers WHERE id = $1`, [id]);
    return { ok: true };
  }
}
