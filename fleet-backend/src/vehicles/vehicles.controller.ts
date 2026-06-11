import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CreateVehicleDto, UpdateVehicleDto } from "./dto/vehicle.dto";
import { VehiclesService } from "./vehicles.service";

@ApiTags("vehicles")
@ApiTenantAuth(UserRole.admin)
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
