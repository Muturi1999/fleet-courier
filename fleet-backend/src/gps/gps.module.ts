import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { GpsController } from "./gps.controller";
import { GpsService } from "./gps.service";

@Module({
  imports: [TenantsModule],
  controllers: [GpsController],
  providers: [GpsService],
  exports: [GpsService],
})
export class GpsModule {}
