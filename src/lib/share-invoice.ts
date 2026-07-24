import type { Invoice } from "./types";

/** Invoices that can be shared (or re-shared) with the partner portal. */
export function canShareInvoice(inv: Invoice): boolean {
  // Rejected can be corrected and re-shared; keep SOA link if present.
  if (inv.status === "rejected") return true;
  if (inv.consolidatedInvoiceId) return false;
  return inv.status === "draft" || inv.status === "sent";
}

export async function shareInvoiceWithPartner(id: string): Promise<Response> {
  return fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status: "sent" }),
  });
}
