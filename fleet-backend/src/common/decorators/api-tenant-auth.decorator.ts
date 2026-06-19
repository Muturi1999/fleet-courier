import { applyDecorators, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { TenantFromJwtInterceptor } from "../interceptors/tenant-from-jwt.interceptor";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { TenantGuard } from "../guards/tenant.guard";
import { Roles } from "./roles.decorator";

export function ApiTenantAuth(...roles: UserRole[]) {
  const decorators = [
    UseGuards(JwtAuthGuard, TenantGuard, RolesGuard),
    UseInterceptors(TenantFromJwtInterceptor),
    ApiBearerAuth(),
    ApiSecurity("tenant-slug"),
  ];
  if (roles.length) decorators.push(Roles(...roles));
  return applyDecorators(...decorators);
}
