import { Module, forwardRef } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { OrdersModule } from "../orders/orders.module";
import { WorkflowsModule } from "../workflows/workflows.module";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";

@Module({
  imports: [TenantsModule, forwardRef(() => OrdersModule), WorkflowsModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
