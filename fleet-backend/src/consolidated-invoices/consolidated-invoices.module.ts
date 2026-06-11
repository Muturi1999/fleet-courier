import { Module } from "@nestjs/common";
import { ConsolidatedInvoicesController } from "./consolidated-invoices.controller";
import { ConsolidatedInvoicesService } from "./consolidated-invoices.service";

@Module({
  controllers: [ConsolidatedInvoicesController],
  providers: [ConsolidatedInvoicesService],
})
export class ConsolidatedInvoicesModule {}
