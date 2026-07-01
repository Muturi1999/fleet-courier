import type { EtimsFilingPreview } from "@/lib/etims-types";

/** Digitax sale / receipt URL for the QR — only real links, no text stubs. */
export function etimsQrPayload(data: EtimsFilingPreview): string {
  if (data.digitaxSaleUrl?.trim()) return data.digitaxSaleUrl.trim();
  if (data.etimsUrl?.trim()) return data.etimsUrl.trim();
  return "";
}

export function etimsQrPayloadFromUrls(urls: { digitaxSaleUrl?: string; etimsUrl?: string; qrUrl?: string }): string {
  if (urls.qrUrl?.trim()) return urls.qrUrl.trim();
  if (urls.digitaxSaleUrl?.trim()) return urls.digitaxSaleUrl.trim();
  if (urls.etimsUrl?.trim()) return urls.etimsUrl.trim();
  return "";
}

export function etimsHasQr(data: EtimsFilingPreview): boolean {
  return Boolean(etimsQrPayload(data));
}

export function etimsQrImageUrl(payload: string, size = 128): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&format=png&data=${encodeURIComponent(payload)}`;
}

export function etimsQrCaption(data: EtimsFilingPreview): string {
  if (data.digitaxSaleUrl) return "Scan to view sale on Digitax";
  if (data.etimsUrl) return "Scan for KRA eTIMS receipt";
  return "QR available after Digitax submit";
}
