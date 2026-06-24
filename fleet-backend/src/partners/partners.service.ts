import { ConflictException, Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePartnerDto } from "./dto/create-partner.dto";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "partner";
}

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: ManagedCredentialService,
  ) {}

  list(tenantId: string) {
    return this.prisma.partner.findMany({
      where: { tenantId, active: true },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, active: true, role: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(tenantId: string, dto: CreatePartnerDto) {
    const slug = dto.slug ?? slugify(dto.name);
    const exists = await this.prisma.partner.findFirst({ where: { tenantId, slug } });
    if (exists) throw new ConflictException("Partner slug already exists in this workspace");

    const username = dto.portalUsername ?? slug;
    const userExists = await this.prisma.user.findFirst({ where: { tenantId, username } });
    if (userExists) throw new ConflictException("Portal username already taken");

    const partner = await this.prisma.partner.create({
      data: {
        tenantId,
        slug,
        name: dto.name,
        legalName: dto.legalName,
        email: dto.email,
      },
    });

    let portalUser: { username: string; password: string } | undefined;
    if (dto.createPortalLogin !== false) {
      const password = dto.portalPassword ?? `${slug.slice(0, 4)}Portal1!`;
      const user = await this.prisma.user.create({
        data: {
          tenantId,
          partnerId: partner.id,
          username,
          displayName: `${dto.name} Partner`,
          role: UserRole.client,
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      await this.credentials.store(user.id, password);
      portalUser = { username, password };
    }

    return { partner, portal: portalUser };
  }

  async defaultPartnerId(tenantId: string): Promise<string | null> {
    const p = await this.prisma.partner.findFirst({
      where: { tenantId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return p?.id ?? null;
  }
}
