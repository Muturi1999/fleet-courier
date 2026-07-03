import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtPayload } from "../../auth/auth.service";
import { REQUIRE_FEATURE_KEY } from "../decorators/require-feature.decorator";
import type { TenantFeatureKey } from "../../tenants/tenant-capabilities";
import { TenantCapabilitiesService } from "../../tenants/tenant-capabilities.service";

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilities: TenantCapabilitiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<TenantFeatureKey | undefined>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new ForbiddenException("Workspace required");

    const caps = await this.capabilities.getForTenantId(tenantId);
    if (!caps?.features[feature]) {
      throw new ForbiddenException(`Feature "${feature}" is not enabled for this workspace`);
    }
    return true;
  }
}
