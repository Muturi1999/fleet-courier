import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CreateRouteDto, UpdateRouteDto } from "./dto/route.dto";
import { RoutesService } from "./routes.service";

@ApiTags("routes")
@ApiTenantAuth(UserRole.admin)
@Controller("routes")
export class RoutesController {
  constructor(private readonly service: RoutesService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRouteDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
