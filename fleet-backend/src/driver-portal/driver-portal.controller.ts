import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import { UserRole } from "@prisma/client";
import { DriverLoginDto, DriverTripUpdateDto } from "./dto/driver-portal.dto";
import { DriverPortalService } from "./driver-portal.service";

@ApiTags("driver-portal")
@Controller("driver-portal")
export class DriverPortalController {
  constructor(private readonly service: DriverPortalService) {}

  @Post("login")
  login(@Body() dto: DriverLoginDto) {
    return this.service.login(dto);
  }

  @Get("trips")
  @ApiTenantAuth(UserRole.admin)
  @UseGuards(FeatureGuard)
  @RequireFeature("driver_portal")
  trips(@Query("driverId") driverId: string) {
    return this.service.trips(driverId);
  }

  @Patch("trips/:id")
  @ApiTenantAuth(UserRole.admin)
  @UseGuards(FeatureGuard)
  @RequireFeature("driver_portal")
  updateTrip(
    @Query("driverId") driverId: string,
    @Param("id") id: string,
    @Body() dto: DriverTripUpdateDto,
  ) {
    return this.service.updateTrip(driverId, id, dto);
  }
}
