import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../common/database/postgres-pool.provider";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { PrismaService } from "../prisma/prisma.service";

function slugifyPartner(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "partner";
}

function generatePassword() {
  return randomBytes(6).toString("base64url") + "A1";
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: ManagedCredentialService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [tenantCount, activeTenants, partnersCount, usersCount, newThisMonth, newPrevMonth] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { active: true } }),
        this.prisma.partner.count({ where: { active: true } }),
        this.prisma.user.count({ where: { active: true } }),
        this.prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
        this.prisma.tenant.count({
          where: { createdAt: { gte: prevMonthStart, lt: monthStart } },
        }),
      ]);

    const growthRate =
      newPrevMonth === 0 ? (newThisMonth > 0 ? 100 : 0) : ((newThisMonth - newPrevMonth) / newPrevMonth) * 100;

    return {
      tenants: { total: tenantCount, active: activeTenants, newThisMonth, growthRatePct: Math.round(growthRate) },
      partners: partnersCount,
      users: usersCount,
    };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, partners: true } },
        partners: { select: { id: true, slug: true, name: true, active: true } },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      active: t.active,
      contract: t.contract,
      createdAt: t.createdAt,
      userCount: t._count.users,
      partnerCount: t._count.partners,
      partners: t.partners,
    }));
  }

  async getTenant(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        users: {
          include: { partner: { select: { id: true, name: true, slug: true } } },
          orderBy: { role: "asc" },
        },
        partners: { orderBy: { name: "asc" } },
      },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const users = await Promise.all(
      tenant.users.map(async (u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        active: u.active,
        partnerId: u.partnerId,
        partnerName: u.partner?.name ?? null,
        password: await this.credentials.reveal(u.id),
        createdAt: u.createdAt,
      })),
    );

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      schema: tenant.schema,
      active: tenant.active,
      contract: tenant.contract,
      createdAt: tenant.createdAt,
      partners: tenant.partners,
      users,
    };
  }

  async resetUserPassword(tenantSlug: string, userId: string, newPassword?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId: tenant.id } });
    if (!user) throw new NotFoundException("User not found");

    const password = newPassword ?? generatePassword();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    await this.credentials.store(user.id, password);

    return {
      userId: user.id,
      username: user.username,
      password,
      tenantSlug: tenant.slug,
    };
  }

  async backfillPartners() {
    const tenants = await this.prisma.tenant.findMany({ where: { active: true } });
    const results: { slug: string; partners: number; linked: boolean }[] = [];

    for (const tenant of tenants) {
      let partnerCount = await this.prisma.partner.count({ where: { tenantId: tenant.id } });

      if (partnerCount === 0) {
        const clientParty = await this.readBillingClient(tenant.schema);
        const name = clientParty?.name ?? "Partner";
        const slug = slugifyPartner(name);
        await this.prisma.partner.create({
          data: {
            tenantId: tenant.id,
            slug,
            name,
            legalName: clientParty?.legalName ?? name,
            email: clientParty?.email ?? null,
          },
        });
        partnerCount = 1;
      }

      const partners = await this.prisma.partner.findMany({ where: { tenantId: tenant.id } });
      const defaultPartner = partners[0];

      await this.prisma.user.updateMany({
        where: { tenantId: tenant.id, role: UserRole.client, partnerId: null },
        data: { partnerId: defaultPartner.id },
      });

      await this.backfillTenantPartnerIds(tenant.schema, defaultPartner.id);
      results.push({ slug: tenant.slug, partners: partnerCount, linked: true });
    }

    return results;
  }

  private async readBillingClient(schema: string) {
    const db = await this.pool.connect();
    try {
      await db.query(`SET search_path TO "${schema}"`);
      const res = await db.query(`SELECT client FROM billing_profiles ORDER BY created_at DESC LIMIT 1`);
      return res.rows[0]?.client as { name?: string; legalName?: string; email?: string } | undefined;
    } catch {
      return undefined;
    } finally {
      db.release();
    }
  }

  private async backfillTenantPartnerIds(schema: string, partnerId: string) {
    const db = await this.pool.connect();
    try {
      await db.query(`SET search_path TO "${schema}"`);
      const tables = ["invoices", "work_tickets", "consolidated_invoices", "workflow_notifications", "billing_profiles"];
      for (const table of tables) {
        await db.query(`UPDATE ${table} SET partner_id = $1::uuid WHERE partner_id IS NULL`, [partnerId]);
      }
    } finally {
      db.release();
    }
  }
}
