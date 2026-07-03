import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import {
  CreateMaintenanceScheduleDto,
  CreateWorkOrderDto,
  UpdateMaintenanceScheduleDto,
  UpdateWorkOrderDto,
} from "./dto/maintenance.dto";
import { MaintenanceService } from "./maintenance.service";

@ApiTags("maintenance")
@ApiTenantAuth(UserRole.admin)
@UseGuards(FeatureGuard)
@RequireFeature("maintenance")
@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get("schedules")
  schedules() {
    return this.service.listSchedules();
  }

  @Get("schedules/due")
  due(@Query("days") days?: string) {
    return this.service.dueSoon(days ? parseInt(days, 10) : 14);
  }

  @Post("schedules")
  createSchedule(@Body() dto: CreateMaintenanceScheduleDto) {
    return this.service.createSchedule(dto);
  }

  @Patch("schedules/:id")
  updateSchedule(@Param("id") id: string, @Body() dto: UpdateMaintenanceScheduleDto) {
    return this.service.updateSchedule(id, dto);
  }

  @Get("work-orders")
  workOrders(@Query("status") status?: string) {
    return this.service.listWorkOrders(status);
  }

  @Post("work-orders")
  createWorkOrder(@Body() dto: CreateWorkOrderDto) {
    return this.service.createWorkOrder(dto);
  }

  @Patch("work-orders/:id")
  updateWorkOrder(@Param("id") id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.service.updateWorkOrder(id, dto);
  }
}
