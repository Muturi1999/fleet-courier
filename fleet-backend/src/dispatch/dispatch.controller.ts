import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { FeatureGuard } from "../common/guards/feature.guard";
import { CreateDispatchDto, ReassignDispatchDto, UpdateDispatchDto } from "./dto/dispatch.dto";
import { DispatchService } from "./dispatch.service";

@ApiTags("dispatch")
@ApiTenantAuth(UserRole.admin)
@UseGuards(FeatureGuard)
@RequireFeature("dispatch")
@Controller("dispatch")
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Get()
  list(@Query() query: ListQueryDto) {
    return this.service.findAll(query);
  }

  @Get("dashboard")
  dashboard() {
    return this.service.dashboard();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post("assign")
  assign(@Body() dto: CreateDispatchDto) {
    return this.service.assign(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDispatchDto) {
    return this.service.update(id, dto);
  }

  @Post(":id/reassign")
  reassign(@Param("id") id: string, @Body() dto: ReassignDispatchDto) {
    return this.service.reassign(id, dto);
  }
}
