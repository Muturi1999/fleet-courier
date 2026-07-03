import { Module } from "@nestjs/common";
import { PartnerScopeService } from "../common/services/partner-scope.service";
import { WorkflowsModule } from "../workflows/workflows.module";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";

@Module({
  imports: [WorkflowsModule],
  controllers: [ClientsController],
  providers: [ClientsService, PartnerScopeService],
})
export class ClientsModule {}
