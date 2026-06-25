/**
 * Standalone Digitax eTIMS connectivity + VAT test.
 * Usage: DIGITAX_API_KEY=... npx ts-node scripts/test-digitax-etims.ts
 */
import { DigitaxClient } from "../src/etims/digitax.client";
import { buildDigitaxSalePayload } from "../src/etims/digitax-sale.builder";

class EnvConfig {
  get(key: string): string | undefined {
    return process.env[key];
  }
}

async function main() {
  const config = new EnvConfig();
  const client = new DigitaxClient(config as never);

  if (!client.isConfigured()) {
    console.error("Set DIGITAX_API_KEY to run this test.");
    process.exit(1);
  }

  console.log("1. Testing Digitax connection…");
  const info = await client.getEtimsInfo();
  console.log(`   Connected: ${info.manager_name} (${info.tax_pin})`);

  const stamp = Date.now().toString().slice(-6);
  const invoice = {
    id: `test-${stamp}`,
    invoice_no: `SWF-ETIMS-${stamp}`,
    plate: "KAA 000A",
    route: "Nairobi — Mombasa",
    days: 1,
    net: 1000,
    vat: 160,
    total: 1160,
    service_date: new Date().toISOString().slice(0, 10),
    period: "Integration test",
  };

  const payload = buildDigitaxSalePayload(
    invoice,
    { legalName: "G4S Courier Services Kenya Ltd", pin: "P051987654G" },
    config.get("DIGITAX_ITEM_CLASS_CODE") ?? "78000000",
  );

  console.log("2. Submitting test sale to KRA eTIMS…");
  const sale = await client.createSaleWithItems(payload);
  const summary = sale.sales_tax_summary;

  console.log("3. Results:");
  console.log(`   Sale ID: ${sale.id}`);
  console.log(`   Status: ${sale.status}`);
  console.log(`   CU serial: ${sale.serial_number ?? "—"}`);
  console.log(`   VAT (band B): KES ${summary?.tax_amount_b ?? "?"}`);
  console.log(`   Taxable: KES ${summary?.taxable_amount_b ?? "?"}`);
  console.log(`   KRA URL: ${sale.etims_url ?? sale.offline_url ?? "pending"}`);

  const vatOk = summary ? Math.abs(summary.tax_amount_b - invoice.vat) <= 1 : false;
  if (!vatOk) {
    console.error("   VAT mismatch — expected KES 160");
    process.exit(1);
  }
  if (sale.status !== "COMPLETED") {
    console.warn("   Sale not yet COMPLETED — poll GET /sales/:id later");
    process.exit(0);
  }
  console.log("   VAT recorded and synced with KRA eTIMS.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
