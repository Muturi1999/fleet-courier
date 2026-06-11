import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: "List active tenants (public registry)" })
  list() {
    return this.tenantsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: "Provision new tenant + isolated PostgreSQL schema" })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }
}
