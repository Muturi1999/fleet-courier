import { ConfigService } from "@nestjs/config";

/** Digitax / KRA eTIMS is enabled only for this tenant workspace (fleet operator filing VAT). */
export function etimsTenantSlug(config: ConfigService): string {
  return config.get<string>("DIGITAX_TENANT_SLUG") ?? "g4s-kenya";
}

export function isEtimsTenant(slug: string, config: ConfigService): boolean {
  return slug === etimsTenantSlug(config);
}

export const ETIMS_DISABLED_MESSAGE = "KRA eTIMS is not configured.";
