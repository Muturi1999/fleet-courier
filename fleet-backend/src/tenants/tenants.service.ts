import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Pool } from "pg";
import { PG_POOL } from "../common/database/postgres-pool.provider";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { OnboardTenantDto } from "./dto/onboard-tenant.dto";
import { TenantProvisioningService, tenantSchemaName } from "./tenant-provisioning.service";
import type { PatchRunResult } from "../common/database/tenant-patch.runner";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: TenantProvisioningService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  findAll() {
    return this.prisma.tenant.findMany({
      where: { active: true },
      select: { id: true, slug: true, name: true, contract: true, createdAt: true },
    });
  }

  async isSlugAvailable(slug: string) {
    const schema = tenantSchemaName(slug);
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug }, { schema }] },
    });
    return { slug, available: !exists };
  }

  async create(dto: CreateTenantDto) {
    const schema = tenantSchemaName(dto.slug);
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { schema }] },
    });
    if (exists) throw new ConflictException("Tenant slug already exists");

    try {
      await this.provisioning.provisionSchema(schema);
      return await this.prisma.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          schema,
          contract: dto.contract,
        },
      });
    } catch (err) {
      await this.provisioning.dropSchema(schema).catch(() => {});
      throw err;
    }
  }

  async onboard(dto: OnboardTenantDto) {
    if (process.env.ONBOARDING_ENABLED === "false") {
      throw new ForbiddenException("Self-service onboarding is disabled");
    }

    const schema = tenantSchemaName(dto.slug);
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { schema }] },
    });
    if (exists) throw new ConflictException("Organization URL is already taken");

    try {
      await this.provisioning.provisionSchema(schema);

      const tenant = await this.prisma.tenant.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          schema,
          contract: dto.contract,
        },
      });

      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          username: dto.admin.username,
          displayName: dto.admin.displayName ?? dto.name,
          role: UserRole.admin,
          passwordHash: await bcrypt.hash(dto.admin.password, 10),
        },
      });

      let partnerCredentials: { username: string; password: string } | undefined;
      if (dto.createPartnerPortal) {
        const partnerPassword = dto.partnerPassword ?? `${dto.admin.password.slice(0, 4)}Partner1`;
        const partnerLabel = dto.partner?.name ?? "Partner";
        await this.prisma.user.create({
          data: {
            tenantId: tenant.id,
            username: "client",
            displayName: `${partnerLabel} Partner`,
            role: UserRole.client,
            passwordHash: await bcrypt.hash(partnerPassword, 10),
          },
        });
        partnerCredentials = { username: "client", password: partnerPassword };
      }

      await this.seedBillingProfile(schema, dto);

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        admin: {
          username: dto.admin.username,
        },
        partnerPortal: partnerCredentials,
        loginPath: `/login?tenant=${tenant.slug}`,
      };
    } catch (err) {
      await this.prisma.tenant.deleteMany({ where: { slug: dto.slug } }).catch(() => {});
      await this.provisioning.dropSchema(schema).catch(() => {});
      throw err;
    }
  }

  async migrateAllTenantPatches(): Promise<PatchRunResult[]> {
    const tenants = await this.prisma.tenant.findMany({ where: { active: true } });
    const results: PatchRunResult[] = [];
    const client = await this.pool.connect();
    try {
      for (const tenant of tenants) {
        results.push(await this.provisioning.migrateSchemaWithClient(client, tenant.schema));
      }
    } finally {
      client.release();
    }
    return results;
  }

  private async seedBillingProfile(schema: string, dto: OnboardTenantDto) {
    const company = dto.company ?? {};
    const partner = dto.partner ?? {};
    const supplier = {
      name: dto.name,
      legalName: company.legalName ?? dto.name,
      address: company.address ?? "",
      city: company.city ?? "Kenya",
      phone: company.phone ?? "",
      vatNo: company.vatNo ?? "",
      pin: company.pin ?? "",
      email: company.email ?? "",
    };
    const clientParty = {
      name: (partner.name ?? "Partner").toUpperCase(),
      legalName: partner.legalName ?? partner.name ?? "Partner",
      address: partner.address ?? "",
      city: partner.city ?? "Kenya",
      pin: partner.pin ?? "",
      contact: partner.contact ?? "Accounts Payable",
      email: partner.email ?? "",
      contractRef: dto.contract ?? "",
    };

    const db = await this.pool.connect();
    try {
      await db.query(`SET search_path TO "${schema}"`);
      await db.query(
        `INSERT INTO billing_profiles (supplier, client) VALUES ($1::jsonb, $2::jsonb)`,
        [JSON.stringify(supplier), JSON.stringify(clientParty)],
      );
    } finally {
      db.release();
    }
  }
}
