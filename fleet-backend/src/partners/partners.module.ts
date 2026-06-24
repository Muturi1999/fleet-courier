import { Module } from "@nestjs/common";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { PartnersController } from "./partners.controller";
import { PartnersService } from "./partners.service";

@Module({
  controllers: [PartnersController],
  providers: [PartnersService, ManagedCredentialService],
  exports: [PartnersService],
})
export class PartnersModule {}
