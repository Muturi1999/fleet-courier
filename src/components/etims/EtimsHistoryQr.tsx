"use client";

import type { EtimsHistoryItem } from "@/lib/etims-types";
import { etimsQrImageUrl, etimsQrPayloadFromUrls } from "@/lib/etims-qr";

export function EtimsHistoryQr({ row }: { row: EtimsHistoryItem }) {
  const payload = etimsQrPayloadFromUrls(row);
  if (!payload) {
    return <span className="text-xs text-fleet-gray-400">—</span>;
  }

  const href = row.digitaxSaleUrl || row.etimsUrl || row.qrUrl || payload;
  const src = etimsQrImageUrl(payload, 56);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Scan for Digitax / KRA eTIMS receipt"
      className="inline-block rounded-fleet-sm border border-fleet-gray-100 bg-white p-0.5 hover:border-teal/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="eTIMS QR" width={48} height={48} className="h-12 w-12" />
    </a>
  );
}
