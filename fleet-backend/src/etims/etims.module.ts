import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BillingProfileModule } from "../billing-profile/billing-profile.module";
import { DigitaxClient } from "./digitax.client";
import { EtimsController } from "./etims.controller";
import { EtimsProcessor } from "./etims.processor";
import { EtimsService } from "./etims.service";

@Module({
  imports: [BullModule.registerQueue({ name: "etims" }), BillingProfileModule],
  controllers: [EtimsController],
  providers: [DigitaxClient, EtimsService, EtimsProcessor],
  exports: [EtimsService],
})
export class EtimsModule {}
