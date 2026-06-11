import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";
import { SchedulesService } from "./schedules.service";

@ApiTags("schedules")
@ApiTenantAuth(UserRole.admin)
@Controller("schedules")
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: "List schedule entries (tenant schema)" })
  list(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
