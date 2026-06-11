import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (!TenantContextStorage.get()) {
      throw new ForbiddenException(
        "Tenant context required. Use x-tenant-slug header or authenticate with JWT.",
      );
    }
    return true;
  }
}
