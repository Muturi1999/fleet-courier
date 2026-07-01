import type { EtimsFilingPreview } from "@/lib/etims-types";
import { formatEATDisplay } from "@/lib/dates";
import { etimsHasQr, etimsQrCaption, etimsQrImageUrl, etimsQrPayload } from "@/lib/etims-qr";
import { toNum } from "@/lib/utils";

function fmtMoney(n: number) {
  return toNum(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEtimsPrintHtml(data: EtimsFilingPreview, title: string) {
  const vatRate = data.net > 0 ? Math.round((data.vat / data.net) * 100) : 16;
  const line = data.lineItems[0];
  const isConsolidated = data.kind === "consolidated";
  const qrPayload = etimsQrPayload(data);
  const showQr = etimsHasQr(data);
  const qrSrc = showQr ? etimsQrImageUrl(qrPayload, 140) : "";
  const qrCaption = etimsQrCaption(data);
  const unitCell = line ? fmtMoney(line.unitPrice) : "";
  const qtyCell = line ? String(line.quantity) : "";
  const unitHeader = isConsolidated ? "Unit (ex VAT)" : "Unit";
  const amountHeader = isConsolidated ? "Amount ex VAT" : "Amount";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 12mm; font-size: 11px; background: #fff; }
    .doc { max-width: 180mm; margin: 0 auto; }
    .head { border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; text-align: center; }
    .head .sub { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #64748b; margin: 0; }
    .head h1 { font-size: 15px; margin: 6px 0 2px; color: #1e3a5f; text-transform: uppercase; }
    .head .ref { font-size: 10px; color: #64748b; margin: 0; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0; }
    .label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 2px; }
    .right { text-align: right; }
    .meta { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 10px; display: flex; flex-wrap: wrap; gap: 12px 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 7px 4px; text-align: left; vertical-align: top; }
    th { font-size: 9px; text-transform: uppercase; color: #64748b; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { font-size: 9px; color: #64748b; margin-top: 3px; }
    .footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .qr img { width: 96px; height: 96px; border: 1px solid #e2e8f0; border-radius: 4px; }
    .qr p { font-size: 9px; color: #64748b; margin: 6px 0 0; max-width: 120px; }
    .totals { min-width: 200px; font-size: 11px; }
    .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .grand { font-weight: 700; font-size: 13px; border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px; color: #1e3a5f; }
    .note { margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 9px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 8mm; } }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <p class="sub">Kenya Revenue Authority · eTIMS</p>
      <h1>Tax invoice</h1>
      ${data.kind !== "consolidated" ? `<p class="ref">Invoice ${escapeHtml(data.traderInvoiceNumber)}</p>` : ""}
    </div>
    <div class="parties">
      <div>
        <div class="label">Supplier</div>
        <strong>${escapeHtml(data.supplierName)}</strong><br />
        <span class="muted">PIN ${escapeHtml(data.supplierPin || "—")}</span>
      </div>
      <div class="right">
        <strong>${escapeHtml(data.customerName)}</strong><br />
        <span class="muted">PIN ${escapeHtml(data.customerPin || "—")}</span>
      </div>
    </div>
    <div class="meta">
      ${data.kind === "consolidated" ? `<span><span class="label">Invoice </span><strong class="num">${escapeHtml(data.traderInvoiceNumber)}</strong></span>` : ""}
      <span><span class="label">Sale date </span><strong>${escapeHtml(formatEATDisplay(data.saleDate))}</strong></span>
      ${data.periodLabel ? `<span><span class="label">Period </span><strong>${escapeHtml(data.periodLabel)}</strong></span>` : ""}
      ${data.kraReference ? `<span><span class="label">KRA ref </span><strong class="num">${escapeHtml(data.kraReference)}</strong></span>` : ""}
    </div>
    ${
      line
        ? `<table>
      <thead><tr>
        <th>Description</th><th class="num">Qty</th><th class="num">${unitHeader}</th><th class="num">${amountHeader}</th>
      </tr></thead>
      <tbody><tr>
        <td>${escapeHtml(line.description)}<div class="muted">VAT band ${escapeHtml(line.vatBand)}</div></td>
        <td class="num">${qtyCell}</td>
        <td class="num">${unitCell}</td>
        <td class="num">${fmtMoney(line.totalAmount)}</td>
      </tr></tbody>
    </table>`
        : ""
    }
    <div class="footer">
      <div class="qr">
        ${
          showQr
            ? `<img src="${escapeHtml(qrSrc)}" alt="Digitax / KRA eTIMS QR" width="96" height="96" />`
            : `<div style="width:96px;height:96px;border:1px dashed #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center;padding:4px;">QR after submit</div>`
        }
        <p>${escapeHtml(qrCaption)}</p>
      </div>
      <div class="totals">
        <div><span>Taxable (ex VAT)</span><strong>KES ${fmtMoney(data.net)}</strong></div>
        <div><span>VAT (${vatRate}%)</span><strong>KES ${fmtMoney(data.vat)}</strong></div>
        <div class="grand"><span>Total</span><strong>KES ${fmtMoney(data.total)}</strong></div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { window.focus(); window.print(); };
    setTimeout(function() { window.focus(); window.print(); }, 400);
  </script>
</body>
</html>`;
}

/** Opens print dialog immediately via hidden iframe (no blank tab). */
export function printEtimsFiling(data: EtimsFilingPreview, invoiceNo: string) {
  const html = buildEtimsPrintHtml(data, `eTIMS · ${invoiceNo}`);

  const frame = document.createElement("iframe");
  frame.setAttribute("title", "eTIMS print");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument ?? win?.document;
  if (!doc || !win) {
    document.body.removeChild(frame);
    throw new Error("Could not open print dialog");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 1500);
  };

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  window.setTimeout(triggerPrint, 350);
}

/** @deprecated use printEtimsFiling */
export function downloadEtimsFilingPdf(data: EtimsFilingPreview, invoiceNo: string) {
  printEtimsFiling(data, invoiceNo);
}
