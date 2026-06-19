import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BillingProfileModule } from "../billing-profile/billing-profile.module";
import { EtimsController } from "./etims.controller";
import { EtimsProcessor } from "./etims.processor";
import { EtimsService } from "./etims.service";

@Module({
  imports: [BullModule.registerQueue({ name: "etims" }), BillingProfileModule],
  controllers: [EtimsController],
  providers: [EtimsService, EtimsProcessor],
  exports: [EtimsService],
})
export class EtimsModule {}
