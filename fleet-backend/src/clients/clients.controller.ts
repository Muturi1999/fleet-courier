import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { ClientsService } from "./clients.service";

@ApiTags("clients")
@ApiTenantAuth(UserRole.client)
@Controller("clients")
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Partner portal dashboard — current month stats & trends" })
  dashboard(@Query("month") month?: string) {
    return this.service.dashboard(month);
  }

  @Get("invoices")
  @ApiOperation({ summary: "Partner-scoped invoice list (paginated)" })
  listInvoices(@Query() query: ListQueryDto) {
    return this.service.listInvoices(query);
  }

  @Get("invoices/pending")
  @ApiOperation({ summary: "Invoices awaiting client action" })
  pendingInvoices() {
    return this.service.pendingInvoices();
  }

  @Get("invoices/:id")
  getInvoice(@Param("id") id: string) {
    return this.service.findInvoice(id);
  }

  @Post("invoices/:id/approve")
  approve(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.approveInvoice(id, clientNote);
  }

  @Post("invoices/:id/reject")
  reject(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.rejectInvoice(id, clientNote);
  }

  @Get("work-tickets")
  @ApiOperation({ summary: "Partner-scoped work tickets (paginated)" })
  listWorkTickets(@Query() query: ListQueryDto) {
    return this.service.listWorkTickets(query);
  }

  @Get("work-tickets/pending")
  @ApiOperation({ summary: "Work tickets awaiting approval" })
  pendingWorkTickets() {
    return this.service.workTicketsPending();
  }

  @Get("work-tickets/:id")
  getWorkTicket(@Param("id") id: string) {
    return this.service.findWorkTicket(id);
  }

  @Post("work-tickets/:id/approve")
  approveWorkTicket(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.approveWorkTicket(id, clientNote);
  }

  @Post("work-tickets/:id/reject")
  rejectWorkTicket(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.rejectWorkTicket(id, clientNote);
  }

  @Get("notifications")
  notifications(@Query("unread") unread?: string) {
    return this.service.notifications(unread === "true");
  }

  @Patch("notifications/:id/read")
  markRead(@Param("id") id: string) {
    return this.service.markNotificationRead(id);
  }
}
