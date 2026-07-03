import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { PartnersModule } from "../partners/partners.module";
import { WorkflowsModule } from "../workflows/workflows.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [TenantsModule, PartnersModule, WorkflowsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
