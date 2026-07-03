import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buildTenantCapabilities, type TenantCapabilities } from "./tenant-capabilities";

@Injectable()
export class TenantCapabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForSlug(slug: string): Promise<TenantCapabilities | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, active: true },
      select: { slug: true, name: true, profile: true, features: true },
    });
    if (!tenant) return null;
    return buildTenantCapabilities({
      slug: tenant.slug,
      name: tenant.name,
      profile: tenant.profile,
      features: tenant.features as Record<string, unknown> | null,
    });
  }

  async getForTenantId(tenantId: string): Promise<TenantCapabilities | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, active: true },
      select: { slug: true, name: true, profile: true, features: true },
    });
    if (!tenant) return null;
    return buildTenantCapabilities({
      slug: tenant.slug,
      name: tenant.name,
      profile: tenant.profile,
      features: tenant.features as Record<string, unknown> | null,
    });
  }
}
