import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import {
  CreateLocalDeliveryDto,
  CreateSafariDto,
  UpdateLocalDeliveryDto,
  UpdateSafariDto,
} from "./dto/delivery.dto";

@Injectable()
export class DeliveriesService {
  constructor(private readonly db: TenantDatabaseService) {}

  listLocal(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM local_deliveries WHERE LOWER(reg) LIKE $1 ORDER BY created_at DESC`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM local_deliveries ORDER BY created_at DESC`);
  }

  async getLocal(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM local_deliveries WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Local delivery not found");
    return row;
  }

  createLocal(dto: CreateLocalDeliveryDto) {
    return this.db.queryOne(
      `INSERT INTO local_deliveries (reg, m, a, total, service_date, period)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [dto.reg, dto.m, dto.a, dto.total, dto.serviceDate ?? null, dto.period ?? null],
    );
  }

  async updateLocal(id: string, dto: UpdateLocalDeliveryDto) {
    await this.getLocal(id);
    return this.patch("local_deliveries", id, dto, {
      reg: "reg",
      m: "m",
      a: "a",
      total: "total",
      serviceDate: "service_date",
      period: "period",
    });
  }

  async removeLocal(id: string) {
    await this.getLocal(id);
    await this.db.query(`DELETE FROM local_deliveries WHERE id = $1`, [id]);
    return { ok: true };
  }

  listSafari(search?: string) {
    if (search?.trim()) {
      return this.db.queryAll(
        `SELECT * FROM safari_entries WHERE LOWER(reg) LIKE $1 OR LOWER(dest) LIKE $1 ORDER BY created_at DESC`,
        [`%${search.toLowerCase()}%`],
      );
    }
    return this.db.queryAll(`SELECT * FROM safari_entries ORDER BY created_at DESC`);
  }

  async getSafari(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM safari_entries WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Safari entry not found");
    return row;
  }

  createSafari(dto: CreateSafariDto) {
    return this.db.queryOne(
      `INSERT INTO safari_entries (reg, total, flag, dest, service_date, period)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        dto.reg,
        dto.total,
        dto.flag ?? "",
        dto.dest,
        dto.serviceDate ?? null,
        dto.period ?? null,
      ],
    );
  }

  async updateSafari(id: string, dto: UpdateSafariDto) {
    await this.getSafari(id);
    return this.patch("safari_entries", id, dto, {
      reg: "reg",
      total: "total",
      flag: "flag",
      dest: "dest",
      serviceDate: "service_date",
      period: "period",
    });
  }

  async removeSafari(id: string) {
    await this.getSafari(id);
    await this.db.query(`DELETE FROM safari_entries WHERE id = $1`, [id]);
    return { ok: true };
  }

  private async patch(
    table: string,
    id: string,
    dto: object,
    map: Record<string, string>,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
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
      `UPDATE ${table} SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  }
}
