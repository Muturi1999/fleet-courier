import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import {
  CreateLocalDeliveryDto,
  CreateSafariDto,
  UpdateLocalDeliveryDto,
  UpdateSafariDto,
} from "./dto/delivery.dto";
import { DeliveriesService } from "./deliveries.service";

@ApiTags("deliveries")
@ApiTenantAuth(UserRole.admin)
@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Get("local")
  listLocal(@Query("search") search?: string) {
    return this.service.listLocal(search);
  }

  @Get("local/:id")
  getLocal(@Param("id") id: string) {
    return this.service.getLocal(id);
  }

  @Post("local")
  createLocal(@Body() dto: CreateLocalDeliveryDto) {
    return this.service.createLocal(dto);
  }

  @Put("local/:id")
  updateLocal(@Param("id") id: string, @Body() dto: UpdateLocalDeliveryDto) {
    return this.service.updateLocal(id, dto);
  }

  @Delete("local/:id")
  removeLocal(@Param("id") id: string) {
    return this.service.removeLocal(id);
  }

  @Get("safari")
  listSafari(@Query("search") search?: string) {
    return this.service.listSafari(search);
  }

  @Get("safari/:id")
  getSafari(@Param("id") id: string) {
    return this.service.getSafari(id);
  }

  @Post("safari")
  createSafari(@Body() dto: CreateSafariDto) {
    return this.service.createSafari(dto);
  }

  @Put("safari/:id")
  updateSafari(@Param("id") id: string, @Body() dto: UpdateSafariDto) {
    return this.service.updateSafari(id, dto);
  }

  @Delete("safari/:id")
  removeSafari(@Param("id") id: string) {
    return this.service.removeSafari(id);
  }
}
