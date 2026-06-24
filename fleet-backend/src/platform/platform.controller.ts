import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlatformJwtGuard } from "./platform-jwt.guard";
import { PlatformService } from "./platform.service";

class ResetPasswordDto {
  newPassword?: string;
}

@ApiTags("platform")
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard)
@Controller("platform")
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get("stats")
  @ApiOperation({ summary: "Platform-wide growth and usage statistics" })
  stats() {
    return this.service.getStats();
  }

  @Get("tenants")
  @ApiOperation({ summary: "List all fleet operator workspaces" })
  listTenants() {
    return this.service.listTenants();
  }

  @Get("tenants/:slug")
  @ApiOperation({ summary: "Tenant detail with users, partners, and recoverable passwords" })
  getTenant(@Param("slug") slug: string) {
    return this.service.getTenant(slug);
  }

  @Post("tenants/:slug/users/:userId/reset-password")
  @ApiOperation({ summary: "Reset a tenant user password (returns new password once)" })
  resetPassword(
    @Param("slug") slug: string,
    @Param("userId") userId: string,
    @Body() body: ResetPasswordDto,
  ) {
    return this.service.resetUserPassword(slug, userId, body.newPassword);
  }

  @Post("backfill-partners")
  @ApiOperation({ summary: "Link legacy tenants to partner records and scope data" })
  backfill() {
    return this.service.backfillPartners();
  }
}
