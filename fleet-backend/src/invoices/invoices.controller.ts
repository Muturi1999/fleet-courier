import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  @ApiOperation({ summary: "List invoices (?page=&limit= for pagination)" })
  list(@Query() query: PaginationQueryDto, @Query("status") status?: string) {
    return this.service.findAll(query, status);
  }

  @Get("next-number")
  @ApiTenantAuth(UserRole.admin)
  nextNumber() {
    return this.service.nextInvoiceNo();
  }

  @Get(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiTenantAuth(UserRole.admin)
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  update(@Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiTenantAuth(UserRole.admin)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
