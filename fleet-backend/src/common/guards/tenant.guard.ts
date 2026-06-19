import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";
import type { JwtPayload } from "../../auth/auth.service";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    const tenant = TenantContextStorage.get();

    if (user?.tenantSchema) {
      const headerSlug = req.headers["x-tenant-slug"] as string | undefined;
      const headerId = req.headers["x-tenant-id"] as string | undefined;
      if (headerSlug && headerSlug !== user.tenantSlug) {
        throw new ForbiddenException("x-tenant-slug does not match authenticated workspace");
      }
      if (headerId && headerId !== user.tenantId) {
        throw new ForbiddenException("x-tenant-id does not match authenticated workspace");
      }
      return true;
    }

    if (tenant) {
      return true;
    }

    throw new ForbiddenException(
      "Tenant context required. Authenticate with a workspace JWT or pass x-tenant-slug.",
    );
  }
}
