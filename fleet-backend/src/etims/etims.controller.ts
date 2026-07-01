import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { EtimsService } from "./etims.service";

@ApiTags("etims")
@ApiTenantAuth(UserRole.admin)
@Controller("etims")
export class EtimsController {
  constructor(private readonly service: EtimsService) {}

  @Get("status")
  @ApiOperation({ summary: "Test Digitax eTIMS connectivity for this tenant" })
  status() {
    return this.service.testConnection();
  }

  @Get("dashboard")
  @ApiOperation({ summary: "eTIMS filing dashboard — stats and queue" })
  dashboard() {
    return this.service.getDashboard();
  }

  @Get("history")
  @ApiOperation({ summary: "eTIMS filing history and KRA receipts" })
  history() {
    return this.service.listHistory();
  }

  @Get("profile")
  @ApiOperation({ summary: "Tenant filing profile (supplier / KRA PIN)" })
  profile() {
    return this.service.getFilingProfile();
  }

  @Post("invoices/:id/validate")
  @ApiOperation({ summary: "Validate a single invoice against eTIMS checks" })
  validate(@Param("id") id: string) {
    return this.service.validateInvoice(id);
  }

  @Post("invoices/:id/submit")
  @ApiOperation({ summary: "Manually submit invoice to KRA eTIMS via Digitax" })
  submit(@Param("id") id: string) {
    return this.service.submitInvoice(id);
  }

  @Post("invoices/:id/sync")
  @ApiOperation({ summary: "Refresh Digitax sale status for an invoice" })
  sync(@Param("id") id: string) {
    return this.service.syncInvoice(id);
  }

  @Get("invoices/:id/preview")
  @ApiOperation({ summary: "Preview Digitax/KRA payload for a standalone invoice (no submit)" })
  previewInvoice(@Param("id") id: string) {
    return this.service.previewInvoice(id);
  }

  @Get("consolidated-invoices/:id/preview")
  @ApiOperation({ summary: "Preview Digitax/KRA payload for a consolidated SOA (no submit)" })
  previewConsolidated(@Param("id") id: string) {
    return this.service.previewConsolidatedInvoice(id);
  }

  @Post("consolidated-invoices/:id/validate")
  @ApiOperation({ summary: "Validate a consolidated SOA against eTIMS checks" })
  validateConsolidated(@Param("id") id: string) {
    return this.service.validateConsolidatedInvoice(id);
  }

  @Post("consolidated-invoices/:id/submit")
  @ApiOperation({ summary: "Submit consolidated SOA to KRA eTIMS via Digitax (manual)" })
  submitConsolidated(@Param("id") id: string) {
    return this.service.submitConsolidatedInvoice(id);
  }

  @Post("consolidated-invoices/:id/sync")
  @ApiOperation({ summary: "Refresh Digitax sale status for a consolidated SOA" })
  syncConsolidated(@Param("id") id: string) {
    return this.service.syncConsolidatedInvoice(id);
  }

  @Post("consolidated-invoices/:id/share")
  @ApiOperation({ summary: "Notify client portal that KRA eTIMS filing document is available" })
  shareConsolidated(@Param("id") id: string) {
    return this.service.shareConsolidatedFiling(id);
  }

  @Post("invoices/:id/share")
  @ApiOperation({ summary: "Notify client portal that KRA eTIMS filing document is available" })
  shareInvoice(@Param("id") id: string) {
    return this.service.shareInvoiceFiling(id);
  }
}
