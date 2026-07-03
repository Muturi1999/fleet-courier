import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";

@Module({
  imports: [TenantsModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
