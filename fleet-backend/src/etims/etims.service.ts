import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { BillingProfileService } from "../billing-profile/billing-profile.service";

export interface EtimsSubmitResult {
  invoiceId: string;
  status: "queued" | "submitted" | "failed";
  kraReference?: string;
  qrCode?: string;
  message?: string;
}

export interface EtimsValidationResult {
  invoiceId: string;
  invoiceNo: string;
  status: "valid" | "pending" | "failed";
  kraReference?: string;
  cuInvoiceNumber?: string;
  validatedAt: string;
  checks: { label: string; passed: boolean; detail?: string }[];
  message?: string;
}

@Injectable()
export class EtimsService {
  private readonly logger = new Logger(EtimsService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly config: ConfigService,
    private readonly billing: BillingProfileService,
  ) {}

  async validateInvoice(invoiceId: string): Promise<EtimsValidationResult> {
    const invoice = await this.db.queryOne<{
      id: string;
      invoice_no: string;
      route: string;
      days: number;
      net: string | number;
      vat: string | number;
      total: string | number;
    }>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
    if (!invoice) {
      return {
        invoiceId,
        invoiceNo: "",
        status: "failed",
        validatedAt: new Date().toISOString(),
        checks: [{ label: "Invoice exists", passed: false, detail: "Invoice not found" }],
        message: "Invoice not found",
      };
    }

    const profile = (await this.billing.get()) as {
      supplier: { pin?: string };
      client: { pin?: string };
    };
    const net = Number(invoice.net);
    const vat = Number(invoice.vat);
    const total = Number(invoice.total);
    const supplierPin = profile?.supplier?.pin ?? "";
    const clientPin = profile?.client?.pin ?? "";

    const checks: EtimsValidationResult["checks"] = [
      { label: "Supplier KRA PIN", passed: /^P\d{9}[A-Z]$/i.test(supplierPin), detail: supplierPin || "Missing PIN" },
      { label: "Client KRA PIN", passed: /^P\d{9}[A-Z]$/i.test(clientPin), detail: clientPin || "Missing PIN" },
      { label: "VAT amount (16%)", passed: Math.abs(vat - Math.round(net * 0.16)) <= 1, detail: `VAT ${vat}` },
      { label: "Invoice total", passed: total === net + vat, detail: `Total ${total}` },
      { label: "Invoice number", passed: /\d{4,}/.test(invoice.invoice_no), detail: invoice.invoice_no },
      { label: "Service particulars", passed: invoice.route.trim().length > 0 && invoice.days > 0, detail: `${invoice.route} · ${invoice.days} days` },
    ];
    const failed = checks.filter((c) => !c.passed).length;
    const status = failed === 0 ? "valid" : failed >= 3 ? "failed" : "pending";
    const validatedAt = new Date().toISOString();
    const kraReference = status === "valid" ? `KRA-ETIMS-${invoice.invoice_no}` : undefined;
    const cuInvoiceNumber = status === "valid" ? `CU-${invoice.invoice_no.replace(/\D/g, "").padStart(8, "0")}` : undefined;

    await this.db.query(
      `UPDATE invoices
       SET etims_status = $2, etims_ref = COALESCE($3, etims_ref), etims_validated_at = $4, etims_payload = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [invoice.id, status, kraReference ?? null, validatedAt, JSON.stringify({ checks })],
    );

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoice_no,
      status,
      kraReference,
      cuInvoiceNumber,
      validatedAt,
      checks,
      message: failed === 0 ? "Invoice passed KRA eTIMS validation checks and is ready for fiscal submission." : `${failed} check(s) need attention before eTIMS submission.`,
    };
  }

  /**
   * Placeholder for KRA eTIMS integration.
   * Wire to KRA API when credentials and CU serial are available.
   */
  async submitInvoice(invoiceId: string): Promise<EtimsSubmitResult> {
    const invoice = await this.db.queryOne<{ id: string; invoice_no: string; etims_status: string }>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
    if (!invoice) {
      return { invoiceId, status: "failed", message: "Invoice not found" };
    }
    const validation = await this.validateInvoice(invoiceId);
    if (validation.status === "failed") {
      return { invoiceId, status: "failed", message: "Invoice failed eTIMS validation checks" };
    }

    const apiUrl = this.config.get<string>("ETIMS_BASE_URL");
    if (!apiUrl) {
      this.logger.warn(`eTIMS not configured — marking invoice ${invoiceId} as queued`);
      await this.db.query(`UPDATE invoices SET etims_status = 'pending', updated_at = NOW() WHERE id = $1`, [invoiceId]);
      return {
        invoiceId,
        status: "queued",
        message: "eTIMS API not configured; submission stubbed",
      };
    }

    // TODO: POST to KRA eTIMS — sign payload, attach CU serial, store QR
    this.logger.log(`Would submit invoice ${invoice.invoice_no} to eTIMS`);
    const kraReference = `KRA-STUB-${Date.now()}`;
    await this.db.query(
      `UPDATE invoices SET etims_status = 'valid', etims_ref = $2, etims_qr = $3, updated_at = NOW() WHERE id = $1`,
      [invoiceId, kraReference, "data:image/png;base64,stub"],
    );
    return {
      invoiceId,
      status: "submitted",
      kraReference,
      qrCode: "data:image/png;base64,stub",
    };
  }
}
