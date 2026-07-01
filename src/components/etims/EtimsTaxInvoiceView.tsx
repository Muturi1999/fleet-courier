import type { EtimsFilingPreview } from "@/lib/etims-types";
import { formatEATDisplay } from "@/lib/dates";
import { etimsHasQr, etimsQrCaption, etimsQrImageUrl, etimsQrPayload } from "@/lib/etims-qr";
import { toNum } from "@/lib/utils";

function fmtMoney(n: number) {
  return toNum(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Clean KRA eTIMS tax invoice — separate from consolidated SOA paperwork. */
export function EtimsTaxInvoiceView({
  data,
  printRootId,
}: {
  data: EtimsFilingPreview;
  printRootId?: string;
}) {
  const vatRate = data.net > 0 ? Math.round((data.vat / data.net) * 100) : 16;
  const line = data.lineItems[0];
  const isConsolidated = data.kind === "consolidated";
  const qrPayload = etimsQrPayload(data);
  const showQr = etimsHasQr(data);
  const qrSrc = showQr ? etimsQrImageUrl(qrPayload, 120) : "";

  return (
    <div
      id={printRootId}
      className="etims-tax-invoice mx-auto max-w-[640px] rounded-fleet border border-fleet-gray-200 bg-white p-6 text-[12px] text-fleet-gray-800 shadow-sm"
    >
      <div className="border-b-2 border-navy pb-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fleet-gray-400">
          Kenya Revenue Authority · eTIMS
        </p>
        <h1 className="mt-1 text-base font-bold uppercase tracking-wide text-navy">Tax invoice</h1>
        {data.kind !== "consolidated" && (
          <p className="mt-0.5 text-[11px] text-fleet-gray-500">
            Invoice <span className="font-mono font-semibold">{data.traderInvoiceNumber}</span>
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase text-fleet-gray-400">Supplier</p>
          <p className="font-semibold text-navy">{data.supplierName}</p>
          <p className="font-mono text-[11px] text-fleet-gray-600">PIN {data.supplierPin || "—"}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold text-navy">{data.customerName}</p>
          <p className="font-mono text-[11px] text-fleet-gray-600">PIN {data.customerPin || "—"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-y border-fleet-gray-100 py-2.5 text-[11px]">
        {data.kind === "consolidated" && (
          <span>
            <span className="text-fleet-gray-400">Invoice </span>
            <strong className="font-mono">{data.traderInvoiceNumber}</strong>
          </span>
        )}
        <span>
          <span className="text-fleet-gray-400">Sale date </span>
          <strong>{formatEATDisplay(data.saleDate)}</strong>
        </span>
        {data.periodLabel && (
          <span>
            <span className="text-fleet-gray-400">Period </span>
            <strong>{data.periodLabel}</strong>
          </span>
        )}
        {data.kraReference && (
          <span>
            <span className="text-fleet-gray-400">KRA ref </span>
            <strong className="font-mono">{data.kraReference}</strong>
          </span>
        )}
      </div>

      {line && (
        <table className="etims-tax-table mt-4 w-full text-[11px]">
          <thead>
            <tr className="border-b border-fleet-gray-200 text-left text-[10px] uppercase text-fleet-gray-400">
              <th className="pb-2 pr-2 font-semibold">Description</th>
              <th className="pb-2 pr-2 text-center font-semibold">Qty</th>
              <th className="pb-2 pr-2 text-right font-semibold">
                {isConsolidated ? "Unit (KES ex VAT)" : "Unit (KES)"}
              </th>
              <th className="pb-2 text-right font-semibold">
                {isConsolidated ? "Amount ex VAT (KES)" : "Amount (KES)"}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-fleet-gray-100">
              <td className="py-2.5 pr-2 align-top">
                <p className="leading-snug">{line.description}</p>
                <p className="mt-1 text-[10px] text-fleet-gray-400">VAT band {line.vatBand}</p>
              </td>
              <td className="py-2.5 pr-2 text-center align-top font-mono tabular-nums">
                {line.quantity}
              </td>
              <td className="py-2.5 pr-2 text-right align-top font-mono tabular-nums">
                {fmtMoney(line.unitPrice)}
              </td>
              <td className="py-2.5 text-right align-top font-mono tabular-nums">{fmtMoney(line.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          {showQr ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrSrc}
              alt="Digitax / KRA eTIMS QR code"
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-fleet-sm border border-fleet-gray-100 bg-white p-1"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-fleet-sm border border-dashed border-fleet-gray-200 bg-fleet-gray-50 px-2 text-center text-[9px] text-fleet-gray-400">
              QR after submit
            </div>
          )}
          <div className="text-[10px] text-fleet-gray-500">
            <p className="font-medium text-fleet-gray-700">{etimsQrCaption(data)}</p>
          </div>
        </div>

        <div className="min-w-[200px] space-y-1 text-[11px] sm:text-right">
          <div className="flex justify-between gap-4 sm:block">
            <span className="text-fleet-gray-500">Taxable (ex VAT)</span>
            <span className="font-mono font-medium sm:ml-2">KES {fmtMoney(data.net)}</span>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <span className="text-fleet-gray-500">VAT ({vatRate}%)</span>
            <span className="font-mono font-medium sm:ml-2">KES {fmtMoney(data.vat)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-fleet-gray-200 pt-2 text-[13px] font-bold text-navy sm:block">
            <span>Total</span>
            <span className="font-mono sm:ml-2">KES {fmtMoney(data.total)}</span>
          </div>
        </div>
      </div>

      {(data.digitaxSaleUrl || data.etimsUrl) && (
        <p className="mt-2 text-center text-[10px]">
          {data.digitaxSaleUrl ? (
            <a href={data.digitaxSaleUrl} target="_blank" rel="noreferrer" className="text-navy underline">
              View sale on Digitax
            </a>
          ) : (
            <a href={data.etimsUrl} target="_blank" rel="noreferrer" className="text-navy underline">
              Open official KRA receipt
            </a>
          )}
        </p>
      )}
    </div>
  );
}
