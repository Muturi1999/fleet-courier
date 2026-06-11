import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { CreateRateDto, UpdateRateDto } from "./dto/rate.dto";
import { RateCardsService } from "./rate-cards.service";

@ApiTags("rate-cards")
@ApiTenantAuth(UserRole.admin)
@Controller("rate-cards")
export class RateCardsController {
  constructor(private readonly service: RateCardsService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.service.findAll(search);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRateDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
