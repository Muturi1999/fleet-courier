import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { DispatchModule } from "../dispatch/dispatch.module";
import { DriverPortalController } from "./driver-portal.controller";
import { DriverPortalService } from "./driver-portal.service";

@Module({
  imports: [TenantsModule, DispatchModule],
  controllers: [DriverPortalController],
  providers: [DriverPortalService],
})
export class DriverPortalModule {}
