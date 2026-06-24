import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PlatformAuthService, PlatformJwtPayload } from "./platform-auth.service";

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(Strategy, "platform-jwt") {
  constructor(
    config: ConfigService,
    private readonly platformAuth: PlatformAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: PlatformJwtPayload) {
    if (payload.scope !== "platform") {
      throw new UnauthorizedException("Not a platform token");
    }
    return this.platformAuth.validate(payload);
  }
}
