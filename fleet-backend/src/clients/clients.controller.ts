import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ClientsService } from "./clients.service";

@ApiTags("clients")
@ApiTenantAuth(UserRole.client)
@Controller("clients")
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get("invoices/pending")
  @ApiOperation({ summary: "Invoices awaiting client action" })
  pendingInvoices() {
    return this.service.pendingInvoices();
  }

  @Post("invoices/:id/approve")
  approve(@Param("id") id: string) {
    return this.service.approveInvoice(id);
  }

  @Post("invoices/:id/reject")
  reject(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.rejectInvoice(id, clientNote);
  }

  @Get("work-tickets/pending")
  @ApiOperation({ summary: "Work tickets awaiting approval" })
  pendingWorkTickets() {
    return this.service.workTicketsPending();
  }

  @Get("work-tickets")
  @ApiOperation({ summary: "Work tickets shared with G4S" })
  workTickets() {
    return this.service.workTicketsReceived();
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
