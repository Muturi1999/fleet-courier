import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/auth.service";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { PartnersService } from "./partners.service";

@ApiTags("partners")
@ApiTenantAuth(UserRole.admin)
@Controller("partners")
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Get()
  @ApiOperation({ summary: "List partners in this workspace" })
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: "Add a partner with isolated portal credentials" })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartnerDto) {
    return this.service.create(user.tenantId, dto);
  }
}
