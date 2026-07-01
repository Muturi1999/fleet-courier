import type { EtimsFilingPreview } from "@/lib/etims-types";

export type EtimsPreviewTarget = "invoice" | "consolidated";

export function etimsPreviewUrl(target: EtimsPreviewTarget, recordId: string) {
  if (target === "consolidated") {
    return `/api/etims/consolidated/preview?consolidatedInvoiceId=${encodeURIComponent(recordId)}`;
  }
  return `/api/etims/preview?invoiceId=${encodeURIComponent(recordId)}`;
}

export async function fetchEtimsPreview(target: EtimsPreviewTarget, recordId: string): Promise<EtimsFilingPreview> {
  const res = await fetch(etimsPreviewUrl(target, recordId), { cache: "no-store", credentials: "same-origin" });
  const data = (await res.json()) as EtimsFilingPreview & { message?: string };
  if (!res.ok) throw new Error(data.message ?? "Could not load eTIMS preview");
  return data;
}

export async function shareEtimsFiling(target: EtimsPreviewTarget, recordId: string) {
  const url =
    target === "consolidated" ? "/api/etims/consolidated/share" : "/api/etims/invoices/share";
  const body =
    target === "consolidated" ? { consolidatedInvoiceId: recordId } : { invoiceId: recordId };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { message?: string; invoiceNo?: string };
  if (!res.ok) throw new Error(data.message ?? "Could not share eTIMS filing");
  return data;
}
