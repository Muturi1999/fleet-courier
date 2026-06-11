import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CreateDriverDto, UpdateDriverDto } from "./dto/driver.dto";
import { DriversService } from "./drivers.service";

@ApiTags("drivers")
@ApiTenantAuth(UserRole.admin)
@Controller("drivers")
export class DriversController {
  constructor(private readonly service: DriversService) {}

  @Get()
  list(@Query("active") active?: string) {
    return this.service.findAll(active === "true");
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDriverDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
