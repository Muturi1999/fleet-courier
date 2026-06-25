import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { BillingProfileService } from "../billing-profile/billing-profile.service";
import { DigitaxClient } from "./digitax.client";
import { buildDigitaxSalePayload } from "./digitax-sale.builder";
import { ETIMS_DISABLED_MESSAGE, isEtimsTenant } from "./etims-tenant";
import type { DigitaxSale, DigitaxSalesTaxSummary } from "./digitax.types";

export interface EtimsSubmitResult {
  invoiceId: string;
  status: "queued" | "submitted" | "failed" | "pending";
  kraReference?: string;
  qrCode?: string;
  etimsUrl?: string;
  digitaxSaleId?: string;
  salesTaxSummary?: DigitaxSalesTaxSummary;
  message?: string;
}

export interface EtimsValidationResult {
  invoiceId: string;
  invoiceNo: string;
  status: "valid" | "pending" | "failed" | "submitted";
  kraReference?: string;
  cuInvoiceNumber?: string;
  etimsUrl?: string;
  digitaxSaleId?: string;
  validatedAt: string;
  checks: { label: string; passed: boolean; detail?: string }[];
  message?: string;
}

export interface EtimsConnectionTestResult {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  tenantSlug?: string;
  taxPin?: string;
  businessName?: string;
  businessId?: string;
  message: string;
}

export interface EtimsHistoryItem {
  invoiceId: string;
  invoiceNo: string;
  plate: string;
  route: string;
  net: number;
  vat: number;
  total: number;
  etimsStatus: string;
  kraReference?: string;
  etimsUrl?: string;
  filedAt?: string;
  serviceDate?: string;
}

export interface EtimsDashboard {
  enabled: boolean;
  tenantName: string;
  connection: EtimsConnectionTestResult;
  stats: {
    awaitingFiling: number;
    filed: number;
    pending: number;
    failed: number;
    vatFiledThisMonth: number;
  };
  awaiting: EtimsHistoryItem[];
}

type InvoiceRow = {
  id: string;
  invoice_no: string;
  plate: string;
  route: string;
  days: number;
  net: string | number;
  vat: string | number;
  total: string | number;
  service_date?: string | Date | null;
  period?: string | null;
  etims_ref?: string | null;
  etims_qr?: string | null;
  etims_status?: string | null;
  etims_payload?: { digitax?: DigitaxSale; checks?: unknown[] } | null;
};

@Injectable()
export class EtimsService {
  private readonly logger = new Logger(EtimsService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly config: ConfigService,
    private readonly billing: BillingProfileService,
    private readonly digitax: DigitaxClient,
  ) {}

  isEnabledForCurrentTenant(): boolean {
    const tenant = TenantContextStorage.get();
    if (!tenant) return false;
    return isEtimsTenant(tenant.slug, this.config);
  }

  async getDashboard(): Promise<EtimsDashboard> {
    const tenant = TenantContextStorage.getOrThrow();
    const enabled = isEtimsTenant(tenant.slug, this.config);
    const connection = await this.testConnection();

    if (!enabled) {
      return {
        enabled: false,
        tenantName: tenant.name,
        connection,
        stats: { awaitingFiling: 0, filed: 0, pending: 0, failed: 0, vatFiledThisMonth: 0 },
        awaiting: [],
      };
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const statsRow = await this.db.queryOne<{
      awaiting: string;
      filed: string;
      pending: string;
      failed: string;
      vat_month: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('sent', 'approved') AND COALESCE(etims_status, 'pending') NOT IN ('submitted', 'valid')) AS awaiting,
         COUNT(*) FILTER (WHERE etims_status IN ('submitted', 'valid')) AS filed,
         COUNT(*) FILTER (WHERE etims_status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE etims_status = 'failed') AS failed,
         COALESCE(SUM(vat) FILTER (
           WHERE etims_status IN ('submitted', 'valid')
             AND etims_validated_at >= $1
         ), 0) AS vat_month
       FROM invoices`,
      [monthStart.toISOString()],
    );

    const awaitingRows = await this.db.queryAll<EtimsHistoryItem & { id: string }>(
      `SELECT id, invoice_no AS "invoiceNo", plate, route,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference", etims_qr AS "etimsUrl",
              etims_validated_at AS "filedAt", service_date AS "serviceDate"
       FROM invoices
       WHERE status IN ('sent', 'approved')
         AND COALESCE(etims_status, 'pending') NOT IN ('submitted', 'valid')
       ORDER BY created_at DESC`,
    );

    return {
      enabled: true,
      tenantName: tenant.name,
      connection,
      stats: {
        awaitingFiling: Number(statsRow?.awaiting ?? 0),
        filed: Number(statsRow?.filed ?? 0),
        pending: Number(statsRow?.pending ?? 0),
        failed: Number(statsRow?.failed ?? 0),
        vatFiledThisMonth: Number(statsRow?.vat_month ?? 0),
      },
      awaiting: awaitingRows.map((r) => ({ ...r, invoiceId: r.id })),
    };
  }

  async listHistory(): Promise<EtimsHistoryItem[]> {
    if (!this.isEnabledForCurrentTenant()) return [];

    const rows = await this.db.queryAll<EtimsHistoryItem & { id: string }>(
      `SELECT id, invoice_no AS "invoiceNo", plate, route,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference", etims_qr AS "etimsUrl",
              etims_validated_at AS "filedAt", service_date AS "serviceDate"
       FROM invoices
       WHERE etims_ref IS NOT NULL
          OR etims_status IN ('submitted', 'valid', 'pending', 'failed')
       ORDER BY etims_validated_at DESC NULLS LAST, created_at DESC`,
    );
    return rows.map((r) => ({ ...r, invoiceId: r.id }));
  }

  async getFilingProfile() {
    if (!this.isEnabledForCurrentTenant()) {
      return { enabled: false, message: ETIMS_DISABLED_MESSAGE };
    }
    const profile = await this.billing.get();
    const connection = await this.testConnection();
    return {
      enabled: true,
      filingEntity: profile?.supplier ?? {},
      buyer: profile?.client ?? {},
      connection,
    };
  }

  async testConnection(): Promise<EtimsConnectionTestResult> {
    const tenant = TenantContextStorage.get();
    const tenantSlug = tenant?.slug;
    const enabled = tenant ? isEtimsTenant(tenant.slug, this.config) : false;

    if (!enabled) {
      return {
        configured: false,
        connected: false,
        enabled: false,
        tenantSlug,
        message: ETIMS_DISABLED_MESSAGE,
      };
    }

    if (!this.digitax.isConfigured()) {
      return {
        configured: false,
        connected: false,
        enabled: true,
        tenantSlug,
        message: "Set DIGITAX_API_KEY in the backend environment to enable KRA eTIMS via Digitax.",
      };
    }
    try {
      const info = await this.digitax.getEtimsInfo();
      return {
        configured: true,
        connected: true,
        enabled: true,
        tenantSlug,
        taxPin: info.tax_pin,
        businessName: info.manager_name,
        businessId: info.business_id,
        message: `Connected to Digitax eTIMS for ${info.manager_name} (${info.tax_pin}).`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Digitax connection failed";
      this.logger.error(`Digitax connection test failed: ${message}`);
      return { configured: true, connected: false, enabled: true, tenantSlug, message };
    }
  }

  async validateInvoice(invoiceId: string): Promise<EtimsValidationResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return this.disabledValidation(invoiceId);
    }
    const invoice = await this.loadInvoice(invoiceId);
    if (!invoice) {
      return this.notFoundValidation(invoiceId);
    }

    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const supplier = (profile?.supplier ?? {}) as { pin?: string };
    const checks = this.buildLocalChecks(invoice, supplier.pin ?? "", client.pin ?? "");
    const digitaxSale = invoice.etims_payload?.digitax;
    if (digitaxSale?.sales_tax_summary) {
      checks.push(...this.buildDigitaxVatChecks(invoice, digitaxSale.sales_tax_summary, digitaxSale));
    }

    const failed = checks.filter((c) => !c.passed).length;
    const alreadySubmitted = Boolean(digitaxSale?.status === "COMPLETED" && digitaxSale.etims_url);
    const status = alreadySubmitted
      ? "submitted"
      : failed === 0
        ? "valid"
        : failed >= 3
          ? "failed"
          : "pending";
    const validatedAt = new Date().toISOString();

    await this.db.query(
      `UPDATE invoices
       SET etims_status = $2, etims_validated_at = $3, etims_payload = $4::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [
        invoice.id,
        status,
        validatedAt,
        JSON.stringify({
          checks,
          digitax: digitaxSale ?? invoice.etims_payload?.digitax ?? null,
        }),
      ],
    );

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoice_no,
      status,
      kraReference: digitaxSale?.serial_number ?? digitaxSale?.receipt_signature ?? invoice.etims_ref ?? undefined,
      cuInvoiceNumber: digitaxSale?.serial_number ?? undefined,
      etimsUrl: digitaxSale?.etims_url ?? invoice.etims_qr ?? undefined,
      digitaxSaleId: digitaxSale?.id,
      validatedAt,
      checks,
      message: this.validationMessage(status, failed, digitaxSale),
    };
  }

  async submitInvoice(invoiceId: string): Promise<EtimsSubmitResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return { invoiceId, status: "failed", message: ETIMS_DISABLED_MESSAGE };
    }
    const invoice = await this.loadInvoice(invoiceId);
    if (!invoice) {
      return { invoiceId, status: "failed", message: "Invoice not found" };
    }

    const validation = await this.validateInvoice(invoiceId);
    if (validation.status === "failed") {
      return { invoiceId, status: "failed", message: validation.message ?? "Invoice failed eTIMS validation checks" };
    }

    const existingSale = invoice.etims_payload?.digitax;
    if (existingSale?.status === "COMPLETED" && existingSale.etims_url) {
      return this.toSubmitResult(invoiceId, existingSale, "Already submitted to KRA eTIMS.");
    }

    if (!this.digitax.isConfigured()) {
      this.logger.warn(`Digitax not configured — marking invoice ${invoiceId} as queued`);
      await this.db.query(`UPDATE invoices SET etims_status = 'pending', updated_at = NOW() WHERE id = $1`, [invoiceId]);
      return {
        invoiceId,
        status: "queued",
        message: "Digitax API key not configured; submission queued",
      };
    }

    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const itemClassCode = this.config.get<string>("DIGITAX_ITEM_CLASS_CODE") ?? "78000000";
    const payload = buildDigitaxSalePayload(invoice, client, itemClassCode);

    try {
      const sale = await this.digitax.createSaleWithItems(payload);
      const vatOk = this.vatMatches(invoice, sale.sales_tax_summary);
      if (!vatOk) {
        this.logger.warn(
          `VAT mismatch for ${invoice.invoice_no}: invoice ${Number(invoice.vat)} vs Digitax ${sale.sales_tax_summary?.tax_amount_b}`,
        );
      }

      const etimsStatus = sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
      const kraReference = sale.serial_number || sale.receipt_signature || sale.id;
      const etimsUrl = sale.etims_url || sale.offline_url || "";

      await this.db.query(
        `UPDATE invoices
         SET etims_status = $2,
             etims_ref = $3,
             etims_qr = $4,
             etims_validated_at = NOW(),
             etims_payload = $5::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [
          invoiceId,
          etimsStatus,
          kraReference,
          etimsUrl,
          JSON.stringify({
            digitax: sale,
            submittedAt: new Date().toISOString(),
            vatSynced: vatOk,
          }),
        ],
      );

      return this.toSubmitResult(
        invoiceId,
        sale,
        sale.status === "COMPLETED"
          ? "Invoice submitted to KRA eTIMS via Digitax. VAT recorded and synced."
          : `Digitax sale ${sale.status.toLowerCase()} — check again shortly.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Digitax submission failed";
      this.logger.error(`eTIMS submit failed for ${invoice.invoice_no}: ${message}`);
      await this.db.query(
        `UPDATE invoices SET etims_status = 'failed', etims_payload = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [invoiceId, JSON.stringify({ error: message, attemptedAt: new Date().toISOString() })],
      );
      return { invoiceId, status: "failed", message };
    }
  }

  async syncInvoice(invoiceId: string): Promise<EtimsSubmitResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return { invoiceId, status: "failed", message: ETIMS_DISABLED_MESSAGE };
    }
    const invoice = await this.loadInvoice(invoiceId);
    if (!invoice) {
      return { invoiceId, status: "failed", message: "Invoice not found" };
    }
    const saleId = invoice.etims_payload?.digitax?.id;
    if (!saleId) {
      return { invoiceId, status: "failed", message: "No Digitax sale on record for this invoice" };
    }
    if (!this.digitax.isConfigured()) {
      return { invoiceId, status: "failed", message: "Digitax API key not configured" };
    }

    const sale = await this.digitax.getSale(saleId);
    const etimsStatus = sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
    await this.db.query(
      `UPDATE invoices
       SET etims_status = $2, etims_ref = $3, etims_qr = $4, etims_payload = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [
        invoiceId,
        etimsStatus,
        sale.serial_number || sale.receipt_signature || sale.id,
        sale.etims_url || sale.offline_url || null,
        JSON.stringify({ digitax: sale, syncedAt: new Date().toISOString() }),
      ],
    );
    return this.toSubmitResult(invoiceId, sale, `Synced Digitax sale status: ${sale.status}`);
  }

  private async loadInvoice(invoiceId: string): Promise<InvoiceRow | null> {
    return this.db.queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
  }

  private disabledValidation(invoiceId: string): EtimsValidationResult {
    return {
      invoiceId,
      invoiceNo: "",
      status: "failed",
      validatedAt: new Date().toISOString(),
      checks: [{ label: "eTIMS", passed: false, detail: ETIMS_DISABLED_MESSAGE }],
      message: ETIMS_DISABLED_MESSAGE,
    };
  }

  private notFoundValidation(invoiceId: string): EtimsValidationResult {
    return {
      invoiceId,
      invoiceNo: "",
      status: "failed",
      validatedAt: new Date().toISOString(),
      checks: [{ label: "Invoice exists", passed: false, detail: "Invoice not found" }],
      message: "Invoice not found",
    };
  }

  private buildLocalChecks(
    invoice: InvoiceRow,
    supplierPin: string,
    clientPin: string,
  ): EtimsValidationResult["checks"] {
    const net = Number(invoice.net);
    const vat = Number(invoice.vat);
    const total = Number(invoice.total);
    return [
      { label: "Supplier KRA PIN", passed: /^P\d{9}[A-Z]$/i.test(supplierPin), detail: supplierPin || "Missing PIN" },
      { label: "Client KRA PIN", passed: /^P\d{9}[A-Z]$/i.test(clientPin), detail: clientPin || "Missing PIN" },
      { label: "VAT amount (16%)", passed: Math.abs(vat - Math.round(net * 0.16)) <= 1, detail: `VAT KES ${vat}` },
      { label: "Invoice total", passed: total === net + vat, detail: `Total KES ${total}` },
      { label: "Invoice number", passed: /\d{4,}/.test(invoice.invoice_no), detail: invoice.invoice_no },
      {
        label: "Service particulars",
        passed: invoice.route.trim().length > 0 && invoice.days > 0,
        detail: `${invoice.route} · ${invoice.days} days`,
      },
    ];
  }

  private buildDigitaxVatChecks(
    invoice: InvoiceRow,
    summary: DigitaxSalesTaxSummary,
    sale: DigitaxSale,
  ): EtimsValidationResult["checks"] {
    const vat = Number(invoice.vat);
    const net = Number(invoice.net);
    return [
      {
        label: "Digitax VAT (16% band B)",
        passed: Math.abs(summary.tax_amount_b - vat) <= 1,
        detail: `KES ${summary.tax_amount_b} on eTIMS vs KES ${vat} on invoice`,
      },
      {
        label: "Digitax taxable amount",
        passed: Math.abs(summary.taxable_amount_b - net) <= 1,
        detail: `KES ${summary.taxable_amount_b} taxable on eTIMS`,
      },
      {
        label: "KRA eTIMS receipt",
        passed: sale.status === "COMPLETED" && Boolean(sale.etims_url),
        detail: sale.etims_url ? "Receipt available on KRA" : `Status: ${sale.status}`,
      },
    ];
  }

  private vatMatches(invoice: InvoiceRow, summary?: DigitaxSalesTaxSummary): boolean {
    if (!summary) return false;
    return Math.abs(summary.tax_amount_b - Number(invoice.vat)) <= 1;
  }

  private validationMessage(status: EtimsValidationResult["status"], failed: number, sale?: DigitaxSale): string {
    if (status === "submitted") {
      return "Invoice is on KRA eTIMS via Digitax with VAT recorded.";
    }
    if (failed === 0) {
      return "Invoice passed KRA eTIMS validation checks and is ready for fiscal submission.";
    }
    return `${failed} check(s) need attention before eTIMS submission.`;
  }

  private toSubmitResult(invoiceId: string, sale: DigitaxSale, message: string): EtimsSubmitResult {
    const status =
      sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
    return {
      invoiceId,
      status,
      kraReference: sale.serial_number || sale.receipt_signature,
      qrCode: sale.etims_url || sale.offline_url,
      etimsUrl: sale.etims_url || sale.offline_url,
      digitaxSaleId: sale.id,
      salesTaxSummary: sale.sales_tax_summary,
      message,
    };
  }
}
