import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TenantContextStorage } from "../tenant-context/tenant-context.storage";

export const CurrentTenant = createParamDecorator(() => {
  return TenantContextStorage.getOrThrow();
});
