import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantProvisioningService, tenantSchemaName } from "./tenant-provisioning.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: TenantProvisioningService,
  ) {}

  findAll() {
    return this.prisma.tenant.findMany({
      where: { active: true },
      select: { id: true, slug: true, name: true, schema: true, contract: true, createdAt: true },
    });
  }

  async create(dto: CreateTenantDto) {
    const schema = tenantSchemaName(dto.slug);
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { schema }] },
    });
    if (exists) throw new ConflictException("Tenant slug already exists");

    await this.provisioning.provisionSchema(schema);

    return this.prisma.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        schema,
        contract: dto.contract,
      },
    });
  }
}
