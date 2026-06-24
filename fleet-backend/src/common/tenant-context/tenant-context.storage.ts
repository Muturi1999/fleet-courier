import { AsyncLocalStorage } from "async_hooks";

export type TenantInfo = {
  id: string;
  slug: string;
  schema: string;
  name: string;
  partnerId?: string | null;
};

const storage = new AsyncLocalStorage<TenantInfo>();

export const TenantContextStorage = {
  run<T>(tenant: TenantInfo, fn: () => T): T {
    return storage.run(tenant, fn);
  },
  get(): TenantInfo | undefined {
    return storage.getStore();
  },
  getOrThrow(): TenantInfo {
    const tenant = storage.getStore();
    if (!tenant) {
      throw new Error("Tenant context not set. Pass x-tenant-id or x-tenant-slug header.");
    }
    return tenant;
  },
};
