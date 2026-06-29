import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ConsolidatedInvoicesQueryDto } from "./dto/consolidated-invoices-query.dto";
import { ConsolidatedActionDto, CreateConsolidatedInvoiceDto, ReviseConsolidatedInvoiceDto } from "./dto/consolidated-invoice.dto";
import { ConsolidatedInvoicesService } from "./consolidated-invoices.service";

@ApiTags("consolidated-invoices")
@Controller("consolidated-invoices")
export class ConsolidatedInvoicesController {
  constructor(private readonly service: ConsolidatedInvoicesService) {}

  @Get()
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  list(@Query() query: ConsolidatedInvoicesQueryDto) {
    if (query.vehicles === "true") return this.service.findBillableVehicles(query.from, query.to);
    if (query.unbilled === "true") {
      return this.service.findUnbilled(query.from, query.to, query.plate, {
        route: query.route,
        cls: query.cls,
        runType: query.runType,
        runRoute: query.runRoute,
      });
    }
    if (query.periodPreview === "true") {
      return this.service.findPeriodPreview(query.from, query.to, query.groupBy ?? "vehicle", {
        route: query.route,
        cls: query.cls,
        runType: query.runType,
        runRoute: query.runRoute,
      });
    }
    return this.service.findAll(query, query.status);
  }

  @Get(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  get(@Param("id") id: string, @Query("detail") detail?: string) {
    if (detail === "full") return this.service.findWithTickets(id);
    return this.service.findOne(id);
  }

  @Post()
  @ApiTenantAuth(UserRole.admin)
  create(@Body() dto: CreateConsolidatedInvoiceDto) {
    return this.service.create(dto);
  }

  @Post(":id/revise")
  @ApiTenantAuth(UserRole.admin)
  @ApiOperation({ summary: "Create a revised draft copy with corrected period (rejected or draft SOA)" })
  revise(@Param("id") id: string, @Body() dto: ReviseConsolidatedInvoiceDto) {
    return this.service.revise(id, dto);
  }

  @Post(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  @ApiOperation({ summary: "send | approve | mark_paid" })
  action(@Param("id") id: string, @Body() dto: ConsolidatedActionDto) {
    if (dto.action === "send") return this.service.updateStatus(id, "pending_approval");
    if (dto.action === "approve") return this.service.updateStatus(id, "approved", { client_note: dto.clientNote ?? null });
    if (dto.action === "reject") return this.service.updateStatus(id, "rejected", { client_note: dto.clientNote ?? null });
    if (dto.action === "mark_paid") return this.service.updateStatus(id, "paid", { paid_at: new Date().toISOString() });
    return { ok: false };
  }

  @Delete(":id")
  @ApiTenantAuth(UserRole.admin)
  @ApiOperation({ summary: "Delete draft consolidated invoice and release trip invoices" })
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
