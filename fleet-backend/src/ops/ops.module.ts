import { Module } from "@nestjs/common";
import { TenantsModule } from "../tenants/tenants.module";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";

@Module({
  imports: [TenantsModule],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
