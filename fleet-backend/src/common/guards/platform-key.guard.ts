import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class PlatformKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("PLATFORM_API_KEY");
    if (!expected) {
      throw new ForbiddenException("Platform provisioning is not configured");
    }
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers["x-platform-key"];
    if (typeof key !== "string" || key !== expected) {
      throw new ForbiddenException("Invalid platform key");
    }
    return true;
  }
}
