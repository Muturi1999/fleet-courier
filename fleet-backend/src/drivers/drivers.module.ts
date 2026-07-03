import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  imports: [TenantsModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
