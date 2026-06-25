import type { EtimsValidationResult } from "./types";

export type EtimsConnectionStatus = {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  tenantSlug?: string;
  taxPin?: string;
  businessName?: string;
  businessId?: string;
  message: string;
};

export type EtimsHistoryItem = {
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
};

export type EtimsDashboard = {
  enabled: boolean;
  tenantName: string;
  connection: EtimsConnectionStatus;
  stats: {
    awaitingFiling: number;
    filed: number;
    pending: number;
    failed: number;
    vatFiledThisMonth: number;
  };
  awaiting: EtimsHistoryItem[];
};

export type EtimsFilingProfile = {
  enabled: boolean;
  message?: string;
  filingEntity?: {
    name?: string;
    address?: string;
    phone?: string;
    vatNo?: string;
    pin?: string;
  };
  buyer?: {
    name?: string;
    legalName?: string;
    pin?: string;
  };
  connection?: EtimsConnectionStatus;
  note?: string;
};

export type EtimsSubmitResult = {
  status: string;
  kraReference?: string;
  etimsUrl?: string;
  digitaxSaleId?: string;
  salesTaxSummary?: { tax_amount_b?: number; taxable_amount_b?: number };
  message?: string;
};

export type { EtimsValidationResult };
