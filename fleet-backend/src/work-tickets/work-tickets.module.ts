import { Module } from "@nestjs/common";
import { PartnersModule } from "../partners/partners.module";
import { WorkTicketInvoiceService } from "./work-ticket-invoice.service";
import { WorkTicketsController } from "./work-tickets.controller";
import { WorkTicketsService } from "./work-tickets.service";

@Module({
  imports: [PartnersModule],
  controllers: [WorkTicketsController],
  providers: [WorkTicketsService, WorkTicketInvoiceService],
  exports: [WorkTicketsService, WorkTicketInvoiceService],
})
export class WorkTicketsModule {}
