import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { EtimsController } from "./etims.controller";
import { EtimsProcessor } from "./etims.processor";
import { EtimsService } from "./etims.service";

@Module({
  imports: [BullModule.registerQueue({ name: "etims" })],
  controllers: [EtimsController],
  providers: [EtimsService, EtimsProcessor],
  exports: [EtimsService],
})
export class EtimsModule {}
