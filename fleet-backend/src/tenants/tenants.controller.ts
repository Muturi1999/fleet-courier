import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { PlatformKeyGuard } from "../common/guards/platform-key.guard";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { OnboardTenantDto } from "./dto/onboard-tenant.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: "List active fleet-operator workspaces" })
  list() {
    return this.tenantsService.findAll();
  }

  @Get("slug-available/:slug")
  @ApiOperation({ summary: "Check if workspace URL slug is available" })
  slugAvailable(@Param("slug") slug: string) {
    return this.tenantsService.isSlugAvailable(slug);
  }

  @Post("onboard")
  @ApiOperation({ summary: "Self-service fleet-operator onboarding" })
  onboard(@Body() dto: OnboardTenantDto) {
    return this.tenantsService.onboard(dto);
  }

  @Post("migrate-patches")
  @UseGuards(PlatformKeyGuard)
  @ApiSecurity("platform-key")
  @ApiOperation({ summary: "Apply pending tenant schema patches to all active workspaces" })
  migratePatches() {
    return this.tenantsService.migrateAllTenantPatches();
  }

  @Post()
  @UseGuards(PlatformKeyGuard)
  @ApiSecurity("platform-key")
  @ApiOperation({ summary: "Provision workspace + isolated PostgreSQL schema (platform admin)" })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }
}
