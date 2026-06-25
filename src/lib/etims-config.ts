/** Tenant workspace where Digitax / KRA eTIMS is enabled (fleet operator filing VAT). */
export const ETIMS_TENANT_SLUG = "g4s-kenya";

export function isEtimsTenant(slug?: string | null): boolean {
  if (!slug) return true;
  return slug === ETIMS_TENANT_SLUG;
}

export const ETIMS_FILING_ENTITY = "Road Network Transporters Limited";
