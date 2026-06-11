import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class TenantFromJwtInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (TenantContextStorage.get()) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.tenantSchema) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      TenantContextStorage.run(
        {
          id: user.tenantId,
          slug: user.tenantSlug,
          schema: user.tenantSchema,
          name: user.tenantName,
        },
        () => {
          next.handle().subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
