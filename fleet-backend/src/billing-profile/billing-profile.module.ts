import { Module } from "@nestjs/common";
import { BillingProfileController } from "./billing-profile.controller";
import { BillingProfileService } from "./billing-profile.service";

@Module({
  controllers: [BillingProfileController],
  providers: [BillingProfileService],
  exports: [BillingProfileService],
})
export class BillingProfileModule {}
