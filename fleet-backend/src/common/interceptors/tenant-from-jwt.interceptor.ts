import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";
import type { JwtPayload } from "../../auth/auth.service";

@Injectable()
export class TenantFromJwtInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;

    if (!user?.tenantSchema) {
      return next.handle();
    }

    const headerSlug = req.headers["x-tenant-slug"] as string | undefined;
    const headerId = req.headers["x-tenant-id"] as string | undefined;
    if (headerSlug && headerSlug !== user.tenantSlug) {
      throw new ForbiddenException("x-tenant-slug does not match authenticated workspace");
    }
    if (headerId && headerId !== user.tenantId) {
      throw new ForbiddenException("x-tenant-id does not match authenticated workspace");
    }

    const tenant = {
      id: user.tenantId,
      slug: user.tenantSlug,
      schema: user.tenantSchema,
      name: user.tenantName,
      partnerId: user.partnerId,
    };

    const existing = TenantContextStorage.get();
    if (existing && existing.id !== tenant.id) {
      throw new ForbiddenException("Tenant context mismatch");
    }

    if (existing?.id === tenant.id) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      TenantContextStorage.run(tenant, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
