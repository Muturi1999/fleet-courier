import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { UpdateBillingProfileDto } from "./dto/billing-profile.dto";
import { BillingProfileService } from "./billing-profile.service";

@ApiTags("billing-profile")
@ApiTenantAuth(UserRole.admin)
@Controller("billing-profile")
export class BillingProfileController {
  constructor(private readonly service: BillingProfileService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  update(@Body() dto: UpdateBillingProfileDto) {
    return this.service.set(dto);
  }
}
