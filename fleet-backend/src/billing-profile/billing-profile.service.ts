import { Injectable } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { UpdateBillingProfileDto } from "./dto/billing-profile.dto";

const DEFAULT_PROFILE = {
  supplier: {
    name: "Road network transporters",
    address: "P.O. Box 4622-00200, Nairobi.",
    phone: "Tel: 020 2011330",
    vatNo: "0161681P",
    pin: "P051470271Y",
  },
  client: {
    name: "G4S COURIER",
    legalName: "G4S Courier Services Kenya Ltd",
    address: "G4S House, Waiyaki Way",
    city: "Nairobi, Kenya",
    pin: "P051987654G",
    contact: "Accounts Payable",
    email: "accounts@g4s.co.ke",
    contractRef: "G4S-RNT-2026-001",
  },
};

@Injectable()
export class BillingProfileService {
  constructor(private readonly db: TenantDatabaseService) {}

  async get() {
    const row = await this.db.queryOne<{ supplier: unknown; client: unknown }>(
      `SELECT supplier, client FROM billing_profiles ORDER BY created_at DESC LIMIT 1`,
    );
    if (!row) {
      return this.set(DEFAULT_PROFILE);
    }
    return row;
  }

  async set(dto: UpdateBillingProfileDto) {
    await this.db.query(`DELETE FROM billing_profiles`);
    return this.db.queryOne(
      `INSERT INTO billing_profiles (supplier, client) VALUES ($1::jsonb, $2::jsonb) RETURNING supplier, client`,
      [JSON.stringify(dto.supplier), JSON.stringify(dto.client)],
    );
  }
}
