import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

export interface EtimsSubmitResult {
  invoiceId: string;
  status: "queued" | "submitted" | "failed";
  kraReference?: string;
  qrCode?: string;
  message?: string;
}

@Injectable()
export class EtimsService {
  private readonly logger = new Logger(EtimsService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Placeholder for KRA eTIMS integration.
   * Wire to KRA API when credentials and CU serial are available.
   */
  async submitInvoice(invoiceId: string): Promise<EtimsSubmitResult> {
    const invoice = await this.db.queryOne(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
    if (!invoice) {
      return { invoiceId, status: "failed", message: "Invoice not found" };
    }

    const apiUrl = this.config.get<string>("ETIMS_BASE_URL");
    if (!apiUrl) {
      this.logger.warn(`eTIMS not configured — marking invoice ${invoiceId} as queued (stub)`);
      return {
        invoiceId,
        status: "queued",
        message: "eTIMS API not configured; submission stubbed",
      };
    }

    // TODO: POST to KRA eTIMS — sign payload, attach CU serial, store QR
    this.logger.log(`Would submit invoice ${(invoice as { invoice_no: string }).invoice_no} to eTIMS`);
    return {
      invoiceId,
      status: "submitted",
      kraReference: `KRA-STUB-${Date.now()}`,
      qrCode: "data:image/png;base64,stub",
    };
  }
}
