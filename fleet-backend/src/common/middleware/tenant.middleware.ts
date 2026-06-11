import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers["x-tenant-id"] as string | undefined;
    const tenantSlug = req.headers["x-tenant-slug"] as string | undefined;

    if (!tenantId && !tenantSlug) {
      return next();
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        active: true,
        OR: [
          tenantId ? { id: tenantId } : undefined,
          tenantSlug ? { slug: tenantSlug } : undefined,
        ].filter(Boolean) as { id?: string; slug?: string }[],
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found or inactive");
    }

    const info = {
      id: tenant.id,
      slug: tenant.slug,
      schema: tenant.schema,
      name: tenant.name,
    };

    TenantContextStorage.run(info, () => next());
  }
}
