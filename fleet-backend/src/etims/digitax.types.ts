export type DigitaxSalesTaxSummary = {
  taxable_amount_a: number;
  taxable_amount_b: number;
  taxable_amount_c: number;
  taxable_amount_d: number;
  taxable_amount_e: number;
  tax_rate_a: number;
  tax_rate_b: number;
  tax_rate_c: number;
  tax_rate_d: number;
  tax_rate_e: number;
  tax_amount_a: number;
  tax_amount_b: number;
  tax_amount_c: number;
  tax_amount_d: number;
  tax_amount_e: number;
};

export type DigitaxSaleItem = {
  id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  taxable_amount: number;
  tax_amount: number;
  tax_rate: number;
  tax_type_code: string;
};

export type DigitaxSale = {
  id: string;
  date: string;
  time?: string;
  trader_invoice_number: string;
  serial_number?: string;
  receipt_signature?: string;
  etims_url?: string;
  offline_url?: string;
  status: "PENDING" | "FAILED" | "COMPLETED" | string;
  customer_name?: string;
  customer_tin?: string;
  sales_tax_summary?: DigitaxSalesTaxSummary;
  item_list?: DigitaxSaleItem[];
  sale_detail_url?: string;
};

export type DigitaxEtimsInfo = {
  tax_pin: string;
  branch_office_id: string;
  branch_office_name: string;
  manager_name: string;
  business_id: string;
};

export type DigitaxSaleWithItemsPayload = {
  sale_date: string;
  customer_name: string;
  customer_tin: string;
  trader_invoice_number: string;
  payment_type_code: string;
  invoice_status_code: string;
  invoice_details?: string;
  items: {
    id: string;
    item_name: string;
    item_class_code: string;
    item_bar_code: string;
    item_tax_type_code: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    is_stockable: boolean;
  }[];
};

/** Best URL for QR / links — Digitax sale view first, then receipt, then KRA. */
export function resolveDigitaxSaleUrl(sale?: Partial<DigitaxSale> | null): string | undefined {
  if (!sale) return undefined;
  const url = sale.sale_detail_url?.trim() || sale.offline_url?.trim() || sale.etims_url?.trim();
  return url || undefined;
}

export type DigitaxApiError = {
  message: string;
  code?: string;
  metadata?: {
    existing_sale_id?: string;
    trader_invoice_number?: string;
    argument?: string;
  };
};
