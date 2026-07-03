import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import { IngestPositionDto, RegisterDeviceDto, SimulateFleetDto } from "./dto/gps.dto";
import { GpsService } from "./gps.service";

@ApiTags("gps")
@ApiTenantAuth(UserRole.admin)
@UseGuards(FeatureGuard)
@RequireFeature("gps_tracking")
@Controller("gps")
export class GpsController {
  constructor(private readonly service: GpsService) {}

  @Get("devices")
  devices() {
    return this.service.listDevices();
  }

  @Get("live")
  live() {
    return this.service.livePositions();
  }

  @Get("alerts")
  alerts() {
    return this.service.openAlerts();
  }

  @Get("positions/:plate")
  positions(@Param("plate") plate: string, @Query("limit") limit?: string) {
    return this.service.positionsForPlate(plate, limit ? parseInt(limit, 10) : 100);
  }

  @Post("devices")
  register(@Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(dto);
  }

  @Post("positions")
  ingest(@Body() dto: IngestPositionDto) {
    return this.service.ingestPosition(dto);
  }

  @Post("webhook/traccar")
  traccarWebhook(@Body() body: { positions?: Record<string, unknown>[] }) {
    return this.service.ingestTraccarWebhook(body);
  }

  @Post("simulate")
  simulate(@Body() dto: SimulateFleetDto) {
    return this.service.simulateFleet(dto.count ?? 5);
  }

  @Patch("alerts/:id/acknowledge")
  acknowledge(@Param("id") id: string) {
    return this.service.acknowledgeAlert(id);
  }
}
