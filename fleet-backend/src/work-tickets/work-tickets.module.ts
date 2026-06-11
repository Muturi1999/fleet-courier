import { Module } from "@nestjs/common";
import { WorkTicketsController } from "./work-tickets.controller";
import { WorkTicketsService } from "./work-tickets.service";

@Module({
  controllers: [WorkTicketsController],
  providers: [WorkTicketsService],
  exports: [WorkTicketsService],
})
export class WorkTicketsModule {}
