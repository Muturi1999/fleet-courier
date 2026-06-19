import { TenantContextStorage, TenantInfo } from "../tenant-context/tenant-context.storage";

/** Wrap async workers (BullMQ, cron) with tenant context — same pattern as EtimsProcessor. */
export function runWithTenant<T>(tenant: TenantInfo, fn: () => Promise<T>): Promise<T> {
  return TenantContextStorage.run(tenant, fn);
}
