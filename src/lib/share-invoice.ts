import type { Invoice } from "./types";

/** Invoices that can be shared (or re-shared) with the partner portal. */
export function canShareInvoice(inv: Invoice): boolean {
  if (inv.consolidatedInvoiceId) return false;
  return inv.status === "draft" || inv.status === "rejected" || inv.status === "sent";
}

export async function shareInvoiceWithPartner(id: string): Promise<Response> {
  return fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status: "sent" }),
  });
}
