import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { BillingProfileService } from "../billing-profile/billing-profile.service";
import { DigitaxClient } from "./digitax.client";
import { buildDigitaxConsolidatedSalePayload, consolidatedEtimsDisplayLine } from "./digitax-consolidated-sale.builder";
import { resolveDigitaxSaleUrl } from "./digitax.types";
import { buildDigitaxSalePayload } from "./digitax-sale.builder";
import { ETIMS_DISABLED_MESSAGE, isEtimsTenant } from "./etims-tenant";
import type { DigitaxSale, DigitaxSalesTaxSummary } from "./digitax.types";

export interface EtimsSubmitResult {
  invoiceId: string;
  consolidatedInvoiceId?: string;
  status: "queued" | "submitted" | "failed" | "pending";
  kraReference?: string;
  qrCode?: string;
  etimsUrl?: string;
  digitaxSaleUrl?: string;
  digitaxSaleId?: string;
  salesTaxSummary?: DigitaxSalesTaxSummary;
  message?: string;
}

export interface EtimsValidationResult {
  invoiceId: string;
  consolidatedInvoiceId?: string;
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
  kind: "invoice" | "consolidated";
  recordId: string;
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
  digitaxSaleUrl?: string;
  qrUrl?: string;
  filedAt?: string;
  serviceDate?: string;
}

export interface EtimsFilingPreviewLine {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  vatBand: string;
}

export interface EtimsFilingPreview {
  kind: "consolidated" | "invoice";
  recordId: string;
  traderInvoiceNumber: string;
  saleDate: string;
  supplierName: string;
  supplierPin: string;
  customerName: string;
  customerPin: string;
  invoiceDetails: string;
  net: number;
  vat: number;
  total: number;
  kraReference?: string;
  etimsUrl?: string;
  digitaxSaleUrl?: string;
  digitaxSaleId?: string;
  periodLabel?: string;
  lineItems: EtimsFilingPreviewLine[];
  filingNote: string;
}

export interface EtimsDashboard {
  enabled: boolean;
  tenantName: string;
  connection: EtimsConnectionTestResult;
  stats: {
    awaitingFiling: number;
    filed: number;
    validated: number;
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
  consolidated_invoice_id?: string | null;
  etims_ref?: string | null;
  etims_qr?: string | null;
  etims_status?: string | null;
  etims_payload?: { digitax?: DigitaxSale; checks?: unknown[] } | null;
};

type ConsolidatedInvoiceRow = {
  id: string;
  invoice_no: string;
  ref_no?: string;
  description: string;
  period_start: string | Date;
  period_end: string | Date;
  invoice_date?: string | Date | null;
  total_trips: number;
  status: string;
  net: string | number;
  vat: string | number;
  total: string | number;
  etims_ref?: string | null;
  etims_qr?: string | null;
  etims_status?: string | null;
  etims_payload?: { digitax?: DigitaxSale; checks?: unknown[] } | null;
  partner_id?: string | null;
};

const ETIMS_SUBMITTED = "('submitted')";
const ETIMS_EXCLUDED_INVOICE = "('submitted', 'consolidated')";

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
        stats: { awaitingFiling: 0, filed: 0, validated: 0, pending: 0, failed: 0, vatFiledThisMonth: 0 },
        awaiting: [],
      };
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const statsRow = await this.db.queryOne<{
      inv_awaiting: string;
      inv_filed: string;
      inv_pending: string;
      inv_failed: string;
      inv_validated: string;
      inv_vat_month: string;
    }>(
      `SELECT
         COUNT(*) FILTER (
           WHERE consolidated_invoice_id IS NULL
             AND status IN ('sent', 'approved')
             AND COALESCE(etims_status, 'pending') NOT IN ${ETIMS_EXCLUDED_INVOICE}
         ) AS inv_awaiting,
         COUNT(*) FILTER (WHERE etims_status IN ${ETIMS_SUBMITTED} AND consolidated_invoice_id IS NULL) AS inv_filed,
         COUNT(*) FILTER (WHERE etims_status = 'pending' AND consolidated_invoice_id IS NULL) AS inv_pending,
         COUNT(*) FILTER (WHERE etims_status = 'failed' AND consolidated_invoice_id IS NULL) AS inv_failed,
         COUNT(*) FILTER (WHERE etims_status = 'valid' AND consolidated_invoice_id IS NULL) AS inv_validated,
         COALESCE(SUM(vat) FILTER (
           WHERE etims_status IN ${ETIMS_SUBMITTED}
             AND consolidated_invoice_id IS NULL
             AND etims_validated_at >= $1
         ), 0) AS inv_vat_month
       FROM invoices`,
      [monthStart.toISOString()],
    );

    const soaStats = await this.db.queryOne<{
      soa_awaiting: string;
      soa_filed: string;
      soa_pending: string;
      soa_failed: string;
      soa_validated: string;
      soa_vat_month: string;
    }>(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('approved', 'paid')
             AND COALESCE(etims_status, 'pending') NOT IN ${ETIMS_SUBMITTED}
         ) AS soa_awaiting,
         COUNT(*) FILTER (WHERE etims_status IN ${ETIMS_SUBMITTED}) AS soa_filed,
         COUNT(*) FILTER (WHERE etims_status = 'pending') AS soa_pending,
         COUNT(*) FILTER (WHERE etims_status = 'failed') AS soa_failed,
         COUNT(*) FILTER (WHERE etims_status = 'valid') AS soa_validated,
         COALESCE(SUM(vat) FILTER (
           WHERE etims_status IN ${ETIMS_SUBMITTED}
             AND etims_validated_at >= $1
         ), 0) AS soa_vat_month
       FROM consolidated_invoices`,
      [monthStart.toISOString()],
    );

    const awaitingInvoices = await this.db.queryAll<EtimsHistoryItem & { id: string }>(
      `SELECT id, invoice_no AS "invoiceNo", plate, route,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference", etims_qr AS "etimsUrl",
              etims_validated_at AS "filedAt", service_date AS "serviceDate"
       FROM invoices
       WHERE consolidated_invoice_id IS NULL
         AND status IN ('sent', 'approved')
         AND COALESCE(etims_status, 'pending') NOT IN ${ETIMS_EXCLUDED_INVOICE}
       ORDER BY created_at DESC`,
    );

    const awaitingSoas = await this.db.queryAll<
      EtimsHistoryItem & { id: string; description: string; period_start: string; period_end: string }
    >(
      `SELECT id, invoice_no AS "invoiceNo", description, period_start, period_end,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference", etims_qr AS "etimsUrl",
              etims_validated_at AS "filedAt", invoice_date AS "serviceDate"
       FROM consolidated_invoices
       WHERE status IN ('approved', 'paid')
         AND COALESCE(etims_status, 'pending') NOT IN ${ETIMS_SUBMITTED}
       ORDER BY approved_at DESC NULLS LAST, created_at DESC`,
    );

    const awaiting = [
      ...awaitingSoas.map((r) => ({
        kind: "consolidated" as const,
        recordId: r.id,
        invoiceId: r.id,
        invoiceNo: r.invoiceNo,
        plate: "SOA",
        route: `${r.description} · ${String(r.period_start).slice(0, 10)} – ${String(r.period_end).slice(0, 10)}`,
        net: r.net,
        vat: r.vat,
        total: r.total,
        etimsStatus: r.etimsStatus,
        kraReference: r.kraReference,
        etimsUrl: r.etimsUrl,
        filedAt: r.filedAt,
        serviceDate: r.serviceDate,
      })),
      ...awaitingInvoices.map((r) => ({
        kind: "invoice" as const,
        recordId: r.id,
        invoiceId: r.id,
        invoiceNo: r.invoiceNo,
        plate: r.plate,
        route: r.route,
        net: r.net,
        vat: r.vat,
        total: r.total,
        etimsStatus: r.etimsStatus,
        kraReference: r.kraReference,
        etimsUrl: r.etimsUrl,
        filedAt: r.filedAt,
        serviceDate: r.serviceDate,
      })),
    ];

    const awaitingFiling =
      Number(statsRow?.inv_awaiting ?? 0) + Number(soaStats?.soa_awaiting ?? 0);
    const filed = Number(statsRow?.inv_filed ?? 0) + Number(soaStats?.soa_filed ?? 0);
    const validated =
      Number(statsRow?.inv_validated ?? 0) + Number(soaStats?.soa_validated ?? 0);
    const pending = Number(statsRow?.inv_pending ?? 0) + Number(soaStats?.soa_pending ?? 0);
    const failed = Number(statsRow?.inv_failed ?? 0) + Number(soaStats?.soa_failed ?? 0);
    const vatFiledThisMonth =
      Number(statsRow?.inv_vat_month ?? 0) + Number(soaStats?.soa_vat_month ?? 0);

    awaiting.sort((a, b) => {
      const rank = (s: string) => (s === "valid" ? 0 : s === "failed" ? 1 : 2);
      return rank(a.etimsStatus) - rank(b.etimsStatus);
    });

    return {
      enabled: true,
      tenantName: tenant.name,
      connection,
      stats: { awaitingFiling, filed, validated, pending, failed, vatFiledThisMonth },
      awaiting,
    };
  }

  async listHistory(): Promise<EtimsHistoryItem[]> {
    if (!this.isEnabledForCurrentTenant()) return [];

    const invoiceRows = await this.db.queryAll<
      EtimsHistoryItem & { id: string; etims_payload?: { digitax?: DigitaxSale } | null; etims_qr?: string | null }
    >(
      `SELECT id, invoice_no AS "invoiceNo", plate, route,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference",
              etims_qr AS "etims_qr", etims_payload AS "etimsPayload",
              etims_validated_at AS "filedAt", service_date AS "serviceDate"
       FROM invoices
       WHERE consolidated_invoice_id IS NULL
         AND etims_status IN ${ETIMS_SUBMITTED}
       ORDER BY etims_validated_at DESC NULLS LAST, created_at DESC`,
    );

    const soaRows = await this.db.queryAll<
      EtimsHistoryItem & {
        id: string;
        description: string;
        period_start: string;
        period_end: string;
        etims_payload?: { digitax?: DigitaxSale } | null;
        etims_qr?: string | null;
      }
    >(
      `SELECT id, invoice_no AS "invoiceNo", description, period_start, period_end,
              net::float, vat::float, total::float,
              etims_status AS "etimsStatus", etims_ref AS "kraReference",
              etims_qr AS "etims_qr", etims_payload AS "etimsPayload",
              etims_validated_at AS "filedAt", invoice_date AS "serviceDate"
       FROM consolidated_invoices
       WHERE etims_status IN ${ETIMS_SUBMITTED}
       ORDER BY etims_validated_at DESC NULLS LAST, created_at DESC`,
    );

    const mapped: EtimsHistoryItem[] = [
      ...soaRows.map((r) =>
        this.mapHistoryRow(
          {
            kind: "consolidated",
            recordId: r.id,
            invoiceId: r.id,
            invoiceNo: r.invoiceNo,
            plate: "SOA",
            route: `${r.description} · ${String(r.period_start).slice(0, 10)} – ${String(r.period_end).slice(0, 10)}`,
            net: r.net,
            vat: r.vat,
            total: r.total,
            etimsStatus: r.etimsStatus,
            kraReference: r.kraReference,
            filedAt: r.filedAt,
            serviceDate: r.serviceDate,
          },
          r.etims_payload,
          r.etims_qr,
        ),
      ),
      ...invoiceRows.map((r) =>
        this.mapHistoryRow(
          {
            kind: "invoice",
            recordId: r.id,
            invoiceId: r.id,
            invoiceNo: r.invoiceNo,
            plate: r.plate,
            route: r.route,
            net: r.net,
            vat: r.vat,
            total: r.total,
            etimsStatus: r.etimsStatus,
            kraReference: r.kraReference,
            filedAt: r.filedAt,
            serviceDate: r.serviceDate,
          },
          r.etims_payload,
          r.etims_qr,
        ),
      ),
    ];

    return mapped.sort((a, b) => (b.filedAt ?? "").localeCompare(a.filedAt ?? ""));
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
    if (invoice.consolidated_invoice_id || invoice.etims_status === "consolidated") {
      return {
        invoiceId,
        invoiceNo: invoice.invoice_no,
        status: "failed",
        validatedAt: new Date().toISOString(),
        checks: [
          {
            label: "Consolidated SOA",
            passed: false,
            detail: "Trip invoice is on a consolidated SOA — file eTIMS from the SOA document instead.",
          },
        ],
        message: "File eTIMS from the consolidated SOA, not individual trip invoices.",
      };
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
    if (invoice.consolidated_invoice_id || invoice.etims_status === "consolidated") {
      return {
        invoiceId,
        status: "failed",
        message: "Trip invoice is on a consolidated SOA — validate and submit eTIMS from the SOA instead.",
      };
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
      const digitaxSaleUrl = resolveDigitaxSaleUrl(sale) || "";
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
          digitaxSaleUrl || etimsUrl || null,
          JSON.stringify({
            digitax: sale,
            submittedAt: new Date().toISOString(),
            vatSynced: vatOk,
          }),
        ],
      );

      if (etimsStatus === "submitted") {
        await this.emitInvoiceEtimsSubmitted(invoice, sale);
      }

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
    const digitaxSaleUrl = resolveDigitaxSaleUrl(sale);
    await this.db.query(
      `UPDATE invoices
       SET etims_status = $2, etims_ref = $3, etims_qr = $4, etims_payload = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [
        invoiceId,
        etimsStatus,
        sale.serial_number || sale.receipt_signature || sale.id,
        digitaxSaleUrl || sale.etims_url || sale.offline_url || null,
        JSON.stringify({ digitax: sale, syncedAt: new Date().toISOString() }),
      ],
    );
    return this.toSubmitResult(invoiceId, sale, `Synced Digitax sale status: ${sale.status}`);
  }

  async validateConsolidatedInvoice(consolidatedId: string): Promise<EtimsValidationResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return this.disabledValidation(consolidatedId);
    }
    const invoice = await this.loadConsolidated(consolidatedId);
    if (!invoice) {
      return this.notFoundValidation(consolidatedId);
    }
    if (!["approved", "paid"].includes(invoice.status)) {
      return {
        invoiceId: consolidatedId,
        consolidatedInvoiceId: consolidatedId,
        invoiceNo: invoice.invoice_no,
        status: "failed",
        validatedAt: new Date().toISOString(),
        checks: [
          {
            label: "SOA approved",
            passed: false,
            detail: `Current status: ${invoice.status}. G4S must approve the SOA before eTIMS filing.`,
          },
        ],
        message: "Consolidated SOA must be approved before KRA eTIMS filing.",
      };
    }

    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const supplier = (profile?.supplier ?? {}) as { pin?: string };
    const checks = this.buildConsolidatedLocalChecks(invoice, supplier.pin ?? "", client.pin ?? "");
    const digitaxSale = invoice.etims_payload?.digitax;
    if (digitaxSale?.sales_tax_summary) {
      checks.push(...this.buildConsolidatedDigitaxVatChecks(invoice, digitaxSale.sales_tax_summary, digitaxSale));
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
      `UPDATE consolidated_invoices
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
      invoiceId: consolidatedId,
      consolidatedInvoiceId: consolidatedId,
      invoiceNo: invoice.invoice_no,
      status,
      kraReference: digitaxSale?.serial_number ?? digitaxSale?.receipt_signature ?? invoice.etims_ref ?? undefined,
      cuInvoiceNumber: digitaxSale?.serial_number ?? undefined,
      etimsUrl: digitaxSale?.etims_url ?? invoice.etims_qr ?? undefined,
      digitaxSaleId: digitaxSale?.id,
      validatedAt,
      checks,
      message: this.consolidatedValidationMessage(status, failed, digitaxSale),
    };
  }

  async submitConsolidatedInvoice(consolidatedId: string): Promise<EtimsSubmitResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: ETIMS_DISABLED_MESSAGE };
    }
    const invoice = await this.loadConsolidated(consolidatedId);
    if (!invoice) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: "Consolidated SOA not found" };
    }

    const validation = await this.validateConsolidatedInvoice(consolidatedId);
    if (validation.status === "failed") {
      return {
        invoiceId: consolidatedId,
        consolidatedInvoiceId: consolidatedId,
        status: "failed",
        message: validation.message ?? "SOA failed eTIMS validation checks",
      };
    }

    const existingSale = invoice.etims_payload?.digitax;
    if (existingSale?.status === "COMPLETED" && existingSale.etims_url) {
      return {
        ...this.toSubmitResult(consolidatedId, existingSale, "Already submitted to KRA eTIMS."),
        consolidatedInvoiceId: consolidatedId,
      };
    }

    if (!this.digitax.isConfigured()) {
      await this.db.query(
        `UPDATE consolidated_invoices SET etims_status = 'pending', updated_at = NOW() WHERE id = $1`,
        [consolidatedId],
      );
      return {
        invoiceId: consolidatedId,
        consolidatedInvoiceId: consolidatedId,
        status: "queued",
        message: "Digitax API key not configured",
      };
    }

    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const itemClassCode = this.config.get<string>("DIGITAX_ITEM_CLASS_CODE") ?? "78000000";
    const payload = await this.buildConsolidatedDigitaxPayload(invoice, client, itemClassCode);

    try {
      const sale = await this.digitax.createSaleWithItems(payload);
      const vatOk = this.consolidatedVatMatches(invoice, sale.sales_tax_summary);
      const etimsStatus = sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
      const kraReference = sale.serial_number || sale.receipt_signature || sale.id;
      const digitaxSaleUrl = resolveDigitaxSaleUrl(sale) || "";
      const etimsUrl = sale.etims_url || sale.offline_url || "";

      await this.db.query(
        `UPDATE consolidated_invoices
         SET etims_status = $2,
             etims_ref = $3,
             etims_qr = $4,
             etims_validated_at = NOW(),
             etims_payload = $5::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [
          consolidatedId,
          etimsStatus,
          kraReference,
          digitaxSaleUrl || etimsUrl || null,
          JSON.stringify({
            digitax: sale,
            submittedAt: new Date().toISOString(),
            vatSynced: vatOk,
          }),
        ],
      );

      if (etimsStatus === "submitted") {
        await this.emitConsolidatedEtimsSubmitted(invoice, sale);
      }

      return {
        ...this.toSubmitResult(
          consolidatedId,
          sale,
          sale.status === "COMPLETED"
            ? "Consolidated SOA submitted to KRA eTIMS via Digitax."
            : `Digitax sale ${sale.status.toLowerCase()} — check again shortly.`,
        ),
        consolidatedInvoiceId: consolidatedId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Digitax submission failed";
      this.logger.error(`eTIMS submit failed for SOA ${invoice.invoice_no}: ${message}`);
      await this.db.query(
        `UPDATE consolidated_invoices SET etims_status = 'failed', etims_payload = $2::jsonb, updated_at = NOW() WHERE id = $1`,
        [consolidatedId, JSON.stringify({ error: message, attemptedAt: new Date().toISOString() })],
      );
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message };
    }
  }

  async syncConsolidatedInvoice(consolidatedId: string): Promise<EtimsSubmitResult> {
    if (!this.isEnabledForCurrentTenant()) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: ETIMS_DISABLED_MESSAGE };
    }
    const invoice = await this.loadConsolidated(consolidatedId);
    if (!invoice) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: "Consolidated SOA not found" };
    }
    const saleId = invoice.etims_payload?.digitax?.id;
    if (!saleId) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: "No Digitax sale on record for this SOA" };
    }
    if (!this.digitax.isConfigured()) {
      return { invoiceId: consolidatedId, consolidatedInvoiceId: consolidatedId, status: "failed", message: "Digitax API key not configured" };
    }

    const sale = await this.digitax.getSale(saleId);
    const etimsStatus = sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
    const digitaxSaleUrl = resolveDigitaxSaleUrl(sale);
    await this.db.query(
      `UPDATE consolidated_invoices
       SET etims_status = $2, etims_ref = $3, etims_qr = $4, etims_payload = $5::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [
        consolidatedId,
        etimsStatus,
        sale.serial_number || sale.receipt_signature || sale.id,
        digitaxSaleUrl || sale.etims_url || sale.offline_url || null,
        JSON.stringify({ digitax: sale, syncedAt: new Date().toISOString() }),
      ],
    );
    return {
      ...this.toSubmitResult(consolidatedId, sale, `Synced Digitax sale status: ${sale.status}`),
      consolidatedInvoiceId: consolidatedId,
    };
  }

  /** What Digitax will receive on manual submit — preview only, no KRA call. */
  async previewConsolidatedInvoice(consolidatedId: string): Promise<EtimsFilingPreview> {
    if (!this.isEnabledForCurrentTenant()) {
      throw new NotFoundException(ETIMS_DISABLED_MESSAGE);
    }
    const invoice = await this.loadConsolidated(consolidatedId);
    if (!invoice) {
      throw new NotFoundException("Consolidated SOA not found");
    }
    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const supplier = (profile?.supplier ?? {}) as { name?: string; pin?: string };
    const itemClassCode = this.config.get<string>("DIGITAX_ITEM_CLASS_CODE") ?? "78000000";
    const payload = await this.buildConsolidatedDigitaxPayload(invoice, client, itemClassCode);
    const periodStart = String(invoice.period_start).slice(0, 10);
    const periodEnd = String(invoice.period_end).slice(0, 10);

    const digitax = invoice.etims_payload?.digitax;
    const digitaxSaleUrl = resolveDigitaxSaleUrl(digitax) ?? (invoice.etims_qr?.trim() || undefined);

    return {
      kind: "consolidated",
      recordId: consolidatedId,
      traderInvoiceNumber: payload.trader_invoice_number,
      saleDate: payload.sale_date,
      supplierName: (supplier.name ?? "Supplier").trim(),
      supplierPin: (supplier.pin ?? "").trim(),
      customerName: payload.customer_name,
      customerPin: payload.customer_tin,
      invoiceDetails: payload.invoice_details ?? "",
      net: Number(invoice.net),
      vat: Number(invoice.vat),
      total: Number(invoice.total),
      kraReference: invoice.etims_ref ?? digitax?.serial_number ?? digitax?.receipt_signature ?? undefined,
      digitaxSaleUrl,
      digitaxSaleId: digitax?.id,
      etimsUrl: digitax?.etims_url ?? digitax?.offline_url ?? undefined,
      periodLabel: `${periodStart} – ${periodEnd}`,
      lineItems: payload.items.map((item) => consolidatedEtimsDisplayLine(item)),
      filingNote:
        "Line amount is ex-VAT (net). VAT and grand total are from the consolidated SOA. Trip detail stays on the SOA schedule only.",
    };
  }

  async shareConsolidatedFiling(consolidatedId: string) {
    const invoice = await this.loadConsolidated(consolidatedId);
    if (!invoice) {
      throw new NotFoundException("Consolidated SOA not found");
    }
    const vat = Number(invoice.vat).toLocaleString("en-KE");
    const total = Number(invoice.total).toLocaleString("en-KE");
    const row = await this.db.queryOne(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor, partner_id)
       VALUES ('client', 'etims_filing_shared', $1, $2, $3, 'admin', $4)
       RETURNING *`,
      [
        `KRA eTIMS tax invoice · SOA ${invoice.invoice_no}`,
        `VAT KES ${vat} · Total KES ${total} — review the eTIMS filing document in Consolidated invoices.`,
        consolidatedId,
        invoice.partner_id ?? null,
      ],
    );
    return { shared: true, notificationId: row?.id, invoiceNo: invoice.invoice_no };
  }

  async shareInvoiceFiling(invoiceId: string) {
    const invoice = await this.loadInvoice(invoiceId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    const vat = Number(invoice.vat).toLocaleString("en-KE");
    const total = Number(invoice.total).toLocaleString("en-KE");
    const row = await this.db.queryOne(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor, partner_id)
       VALUES ('client', 'etims_filing_shared', $1, $2, $3, 'admin', (SELECT partner_id FROM invoices WHERE id = $3))
       RETURNING *`,
      [
        `KRA eTIMS tax invoice · ${invoice.invoice_no}`,
        `${invoice.plate} · VAT KES ${vat} · Total KES ${total}`,
        invoiceId,
      ],
    );
    return { shared: true, notificationId: row?.id, invoiceNo: invoice.invoice_no };
  }

  private async buildConsolidatedDigitaxPayload(
    invoice: ConsolidatedInvoiceRow,
    client: { name?: string; legalName?: string; pin?: string },
    itemClassCode: string,
  ) {
    return buildDigitaxConsolidatedSalePayload(invoice, client, itemClassCode);
  }

  async previewInvoice(invoiceId: string): Promise<EtimsFilingPreview> {
    if (!this.isEnabledForCurrentTenant()) {
      throw new NotFoundException(ETIMS_DISABLED_MESSAGE);
    }
    const invoice = await this.loadInvoice(invoiceId);
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    if (invoice.consolidated_invoice_id || invoice.etims_status === "consolidated") {
      throw new NotFoundException("Trip invoice is on a consolidated SOA — preview eTIMS from the SOA instead.");
    }
    const profile = await this.billing.get();
    const client = (profile?.client ?? {}) as { name?: string; legalName?: string; pin?: string };
    const supplier = (profile?.supplier ?? {}) as { name?: string; pin?: string };
    const itemClassCode = this.config.get<string>("DIGITAX_ITEM_CLASS_CODE") ?? "78000000";
    const payload = buildDigitaxSalePayload(invoice, client, itemClassCode);

    return {
      kind: "invoice",
      recordId: invoiceId,
      traderInvoiceNumber: payload.trader_invoice_number,
      saleDate: payload.sale_date,
      supplierName: (supplier.name ?? "Supplier").trim(),
      supplierPin: (supplier.pin ?? "").trim(),
      customerName: payload.customer_name,
      customerPin: payload.customer_tin,
      invoiceDetails: payload.invoice_details ?? "",
      net: Number(invoice.net),
      vat: Number(invoice.vat),
      total: Number(invoice.total),
      lineItems: payload.items.map((item) => ({
        description: item.item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalAmount: item.total_amount,
        vatBand: item.item_tax_type_code,
      })),
      filingNote: "This is the fiscal payload sent to Digitax/KRA on manual submit.",
    };
  }

  private async loadInvoice(invoiceId: string): Promise<InvoiceRow | null> {
    return this.db.queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
  }

  private async loadConsolidated(consolidatedId: string): Promise<ConsolidatedInvoiceRow | null> {
    return this.db.queryOne<ConsolidatedInvoiceRow>(`SELECT * FROM consolidated_invoices WHERE id = $1`, [consolidatedId]);
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

  private consolidatedVatMatches(invoice: ConsolidatedInvoiceRow, summary?: DigitaxSalesTaxSummary): boolean {
    if (!summary) return false;
    return Math.abs(summary.tax_amount_b - Number(invoice.vat)) <= 1;
  }

  private buildConsolidatedLocalChecks(
    invoice: ConsolidatedInvoiceRow,
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
      { label: "SOA total", passed: total === net + vat, detail: `Total KES ${total}` },
      { label: "SOA serial", passed: /\d{3,}/.test(invoice.invoice_no), detail: invoice.invoice_no },
      {
        label: "Billing period",
        passed: Boolean(invoice.period_start && invoice.period_end),
        detail: `${String(invoice.period_start).slice(0, 10)} – ${String(invoice.period_end).slice(0, 10)}`,
      },
      {
        label: "eTIMS fiscal line",
        passed: true,
        detail: `${Math.max(1, Number(invoice.total_trips) || 1)} trip(s) · avg ex-VAT unit · line net KES ${net.toLocaleString("en-KE")}`,
      },
    ];
  }

  private buildConsolidatedDigitaxVatChecks(
    invoice: ConsolidatedInvoiceRow,
    summary: DigitaxSalesTaxSummary,
    sale: DigitaxSale,
  ): EtimsValidationResult["checks"] {
    const vat = Number(invoice.vat);
    const net = Number(invoice.net);
    return [
      {
        label: "Digitax VAT (16% band B)",
        passed: Math.abs(summary.tax_amount_b - vat) <= 1,
        detail: `KES ${summary.tax_amount_b} on eTIMS vs KES ${vat} on SOA`,
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

  private consolidatedValidationMessage(
    status: EtimsValidationResult["status"],
    failed: number,
    sale?: DigitaxSale,
  ): string {
    if (status === "submitted") {
      return "Consolidated SOA is on KRA eTIMS via Digitax with VAT recorded.";
    }
    if (failed === 0) {
      return "SOA passed KRA eTIMS validation checks and is ready for manual submission.";
    }
    return `${failed} check(s) need attention before eTIMS submission.`;
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

  private mapHistoryRow(
    base: EtimsHistoryItem,
    payload?: { digitax?: DigitaxSale } | null,
    storedQr?: string | null,
  ): EtimsHistoryItem {
    const digitax = payload?.digitax;
    const digitaxSaleUrl = resolveDigitaxSaleUrl(digitax) ?? (storedQr?.trim() || undefined);
    const kraReceiptUrl = digitax?.etims_url?.trim() || digitax?.offline_url?.trim() || undefined;
    const qrUrl = digitaxSaleUrl || kraReceiptUrl;
    return {
      ...base,
      digitaxSaleUrl,
      etimsUrl: kraReceiptUrl,
      qrUrl,
    };
  }

  private async emitConsolidatedEtimsSubmitted(invoice: ConsolidatedInvoiceRow, sale: DigitaxSale) {
    const total = Number(invoice.total).toLocaleString("en-KE");
    const ref = sale.serial_number || sale.receipt_signature || invoice.etims_ref || invoice.invoice_no;
    const soaRef = invoice.ref_no ?? invoice.invoice_no;
    const partnerId = invoice.partner_id ?? null;

    await this.db.query(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor, partner_id)
       VALUES ('admin', 'etims_submitted', $1, $2, $3, 'admin', $4)`,
      [
        `KRA eTIMS filed · SOA ${invoice.invoice_no}`,
        `CU ${ref} · KES ${total} — awaiting payment from G4S.`,
        invoice.id,
        partnerId,
      ],
    );
    await this.db.query(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor, partner_id)
       VALUES ('client', 'etims_submitted', $1, $2, $3, 'admin', $4)`,
      [
        `Tax invoice filed · SOA ${invoice.invoice_no}`,
        `KRA eTIMS receipt issued for ${soaRef}. Payment per contract terms.`,
        invoice.id,
        partnerId,
      ],
    );
  }

  private async emitInvoiceEtimsSubmitted(invoice: InvoiceRow, sale: DigitaxSale) {
    const total = Number(invoice.total).toLocaleString("en-KE");
    const ref = sale.serial_number || sale.receipt_signature || invoice.etims_ref || invoice.invoice_no;

    await this.db.query(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, actor)
       VALUES ('admin', 'etims_submitted', $1, $2, $3, 'admin')`,
      [
        `KRA eTIMS filed · ${invoice.invoice_no}`,
        `CU ${ref} · ${invoice.plate} · KES ${total} — awaiting payment.`,
        invoice.id,
      ],
    );
  }

  private toSubmitResult(invoiceId: string, sale: DigitaxSale, message: string): EtimsSubmitResult {
    const status =
      sale.status === "COMPLETED" ? "submitted" : sale.status === "FAILED" ? "failed" : "pending";
    const digitaxSaleUrl = resolveDigitaxSaleUrl(sale);
    return {
      invoiceId,
      status,
      kraReference: sale.serial_number || sale.receipt_signature,
      qrCode: digitaxSaleUrl || sale.etims_url || sale.offline_url,
      etimsUrl: sale.etims_url || sale.offline_url,
      digitaxSaleUrl,
      digitaxSaleId: sale.id,
      salesTaxSummary: sale.sales_tax_summary,
      message,
    };
  }
}
