import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiTenantAuth(UserRole.admin, UserRole.client)
@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("overview")
  overview(@Query("month") month?: string) {
    return this.service.overview(month);
  }

  @Get("fleet-ranking")
  fleetRanking(@Query("month") month?: string) {
    return this.service.fleetRanking(month);
  }

  @Get("destinations")
  destinations(@Query("month") month?: string) {
    return this.service.destinations(month);
  }

  @Get("vat")
  vat(@Query("month") month?: string) {
    return this.service.vatSummary(month);
  }
}
