import { Injectable, ForbiddenException } from "@nestjs/common";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

@Injectable()
export class PartnerScopeService {
  requirePartnerId(): string {
    const tenant = TenantContextStorage.getOrThrow();
    if (!tenant.partnerId) {
      throw new ForbiddenException("Partner account is not linked to an organization");
    }
    return tenant.partnerId;
  }
}
