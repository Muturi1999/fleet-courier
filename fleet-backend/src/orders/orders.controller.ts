import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { FeatureGuard } from "../common/guards/feature.guard";
import { CreateOrderDto, UpdateOrderDto } from "./dto/order.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@ApiTenantAuth(UserRole.admin)
@UseGuards(FeatureGuard)
@RequireFeature("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list(@Query() query: ListQueryDto, @Query("status") status?: string) {
    return this.service.findAll(query, status);
  }

  @Get("summary")
  summary() {
    return this.service.summary();
  }

  @Get("next-number")
  nextNumber() {
    return this.service.nextOrderNo();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
