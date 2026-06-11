import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { ConsolidatedActionDto, CreateConsolidatedInvoiceDto } from "./dto/consolidated-invoice.dto";
import { ConsolidatedInvoicesService } from "./consolidated-invoices.service";

@ApiTags("consolidated-invoices")
@Controller("consolidated-invoices")
export class ConsolidatedInvoicesController {
  constructor(private readonly service: ConsolidatedInvoicesService) {}

  @Get()
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  list(@Query() query: PaginationQueryDto, @Query("status") status?: string, @Query("unbilled") unbilled?: string, @Query("from") from?: string, @Query("to") to?: string) {
    if (unbilled === "true") return this.service.findUnbilled(from, to);
    return this.service.findAll(query, status);
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

  @Post(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  @ApiOperation({ summary: "send | approve | mark_paid" })
  action(@Param("id") id: string, @Body() dto: ConsolidatedActionDto) {
    if (dto.action === "send") return this.service.updateStatus(id, "pending_approval");
    if (dto.action === "approve") return this.service.updateStatus(id, "approved", { client_note: dto.clientNote ?? null });
    if (dto.action === "mark_paid") return this.service.updateStatus(id, "paid", { paid_at: new Date().toISOString() });
    return { ok: false };
  }
}
