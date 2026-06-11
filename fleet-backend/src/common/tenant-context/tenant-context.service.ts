import { Injectable } from "@nestjs/common";
import { TenantContextStorage, TenantInfo } from "./tenant-context.storage";

@Injectable()
export class TenantContextService {
  setTenant(tenant: TenantInfo) {
    // Used by auth after login — stored on JWT; middleware sets via ALS
    return tenant;
  }

  getTenant(): TenantInfo {
    return TenantContextStorage.getOrThrow();
  }

  getSchema(): string {
    return this.getTenant().schema;
  }
}
