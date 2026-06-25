import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DigitaxApiError,
  DigitaxEtimsInfo,
  DigitaxSale,
  DigitaxSaleWithItemsPayload,
} from "./digitax.types";

@Injectable()
export class DigitaxClient {
  private readonly logger = new Logger(DigitaxClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey());
  }

  apiKey(): string {
    return this.config.get<string>("DIGITAX_API_KEY") ?? "";
  }

  baseUrl(): string {
    return (this.config.get<string>("DIGITAX_BASE_URL") ?? "https://api.digitax.tech/ke/v2").replace(/\/$/, "");
  }

  async getEtimsInfo(): Promise<DigitaxEtimsInfo> {
    return this.request<DigitaxEtimsInfo>("GET", "/etims-info");
  }

  async createSaleWithItems(payload: DigitaxSaleWithItemsPayload): Promise<DigitaxSale> {
    try {
      const created = await this.request<DigitaxSale>("POST", "/sales-with-items", payload, 180_000);
      return this.waitForCompletedSale(created.id);
    } catch (err) {
      const existingId = this.existingSaleId(err);
      if (existingId) {
        this.logger.warn(`Invoice ${payload.trader_invoice_number} already on Digitax — loading ${existingId}`);
        return this.waitForCompletedSale(existingId);
      }
      throw err;
    }
  }

  async getSale(saleId: string): Promise<DigitaxSale> {
    return this.request<DigitaxSale>("GET", `/sales/${saleId}`, undefined, 60_000);
  }

  private async waitForCompletedSale(saleId: string, attempts = 5): Promise<DigitaxSale> {
    let sale = await this.getSale(saleId);
    for (let i = 0; i < attempts && sale.status === "PENDING"; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      sale = await this.getSale(saleId);
    }
    return sale;
  }

  private existingSaleId(err: unknown): string | undefined {
    if (!(err instanceof DigitaxHttpError)) return undefined;
    if (err.status !== 409) return undefined;
    return err.body.metadata?.existing_sale_id;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 30_000,
  ): Promise<T> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new Error("DIGITAX_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      const json = text ? (JSON.parse(text) as T | DigitaxApiError) : ({} as T);
      if (!res.ok) {
        throw new DigitaxHttpError(res.status, json as DigitaxApiError);
      }
      return json as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Digitax API timed out after ${timeoutMs}ms (${method} ${path})`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class DigitaxHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: DigitaxApiError,
  ) {
    super(body.message || `Digitax API error ${status}`);
    this.name = "DigitaxHttpError";
  }
}
