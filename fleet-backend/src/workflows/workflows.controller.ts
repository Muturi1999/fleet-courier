import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { WorkflowsService } from "./workflows.service";

@ApiTags("workflows")
@ApiTenantAuth(UserRole.admin, UserRole.client)
@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Post("soa")
  @ApiOperation({ summary: "SOA workflow action (sent / approved)" })
  soa(@Body("action") action: "soa_sent" | "soa_approved") {
    if (action === "soa_sent") return this.workflows.emitSoaSent();
    if (action === "soa_approved") return this.workflows.emitSoaApproved();
    return { ok: false, error: "Invalid action" };
  }
}
