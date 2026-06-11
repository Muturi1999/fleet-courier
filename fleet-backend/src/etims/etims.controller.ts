import { Controller, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { EtimsService } from "./etims.service";

@ApiTags("etims")
@ApiTenantAuth(UserRole.admin)
@Controller("etims")
export class EtimsController {
  constructor(private readonly service: EtimsService) {}

  @Post("invoices/:id/submit")
  @ApiOperation({ summary: "Manually trigger eTIMS submission for an invoice" })
  submit(@Param("id") id: string) {
    return this.service.submitInvoice(id);
  }
}
