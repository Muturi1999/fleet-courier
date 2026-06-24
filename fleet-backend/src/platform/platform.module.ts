import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ManagedCredentialService } from "../common/services/managed-credential.service";
import { PlatformAuthController } from "./platform-auth.controller";
import { PlatformAuthService } from "./platform-auth.service";
import { PlatformController } from "./platform.controller";
import { PlatformJwtGuard } from "./platform-jwt.guard";
import { PlatformJwtStrategy } from "./platform-jwt.strategy";
import { PlatformService } from "./platform.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN", "8h") },
      }),
    }),
  ],
  controllers: [PlatformAuthController, PlatformController],
  providers: [
    PlatformAuthService,
    PlatformJwtStrategy,
    PlatformJwtGuard,
    PlatformService,
    ManagedCredentialService,
  ],
  exports: [PlatformAuthService, ManagedCredentialService],
})
export class PlatformModule {}
