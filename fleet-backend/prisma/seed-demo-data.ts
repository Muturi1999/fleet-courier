/**
 * Loads the full RNT/G4S demo dataset (from index.html mock data) into the tenant schema.
 * Safe to re-run: skips tables that already have rows unless FORCE_DEMO_SEED=true.
 */
import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  destRevenue,
  febSOA,
  invoiceData,
  localData,
  marchSchedule,
  pendingPortal,
  rates15T,
  rates7T,
  safariData,
  vehicleRevenue,
} from "./mock-data";

const slug = process.env.DEFAULT_TENANT_SLUG ?? "g4s-kenya";
const schema = `tenant_${slug.replace(/-/g, "_")}`;
const force = process.env.FORCE_DEMO_SEED === "true";

function seedServiceDate(index: number, year: number, month: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = (index % daysInMonth) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calcWtAmounts(net: number) {
  const vat = Math.round(net * 0.16);
  return { net, vat, total: net + vat };
}

type InvoiceSeed = {
  invoiceNo: string;
  plate: string;
  cls: string;
  route: string;
  days: number;
  net: number;
  vat: number;
  total: number;
  status: string;
  period: string;
  month: number;
  year: number;
  dateIndex: number;
};

function destToRoute(dest: string, runType: string): string {
  const d = dest.toUpperCase();
  if (d.includes("NAIROBI")) {
    return runType === "Afternoon" ? "Nairobi Afternoon" : "Nairobi Morning";
  }
  return dest
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function plateToCls(plate: string): string {
  return vehicleRevenue.find((v) => v.plate === plate)?.cls ?? "7T";
}

function rateCategory(route: string): string {
  const r = route.toLowerCase();
  if (r.includes("nairobi") || r.includes("van") || r.includes("canter")) return "nairobi";
  return "upcountry";
}

function rateCls(route: string, defaultCls: string): string {
  const r = route.toLowerCase();
  if (r.includes("canter")) return "Canter";
  if (r.includes("van")) return "Van";
  return defaultCls;
}

function buildInvoiceSeed(): InvoiceSeed[] {
  const byNo = new Map<string, InvoiceSeed>();
  const pendingPlates = new Set(pendingPortal.map((p) => p.plate));

  febSOA.forEach((row, i) => {
    const total = row.amt;
    const net = Math.round(total / 1.16);
    byNo.set(String(row.inv), {
      invoiceNo: String(row.inv),
      plate: row.reg,
      cls: plateToCls(row.reg),
      route: "Monthly billing",
      days: 1,
      net,
      vat: total - net,
      total,
      status: "paid",
      period: "Feb 2026",
      month: 2,
      year: 2026,
      dateIndex: i,
    });
  });

  marchSchedule.forEach((e, i) => {
    const invoiceNo = String(18501 + i);
    const status = pendingPlates.has(e.plate)
      ? i % 2 === 0
        ? "sent"
        : "pending"
      : (["paid", "approved", "paid", "approved", "paid"] as const)[i % 5];
    byNo.set(invoiceNo, {
      invoiceNo,
      plate: e.plate,
      cls: e.cls,
      route: destToRoute(e.dest, e.runType),
      days: e.days,
      net: e.cost,
      vat: e.vat,
      total: e.total,
      status,
      period: "Mar 2026",
      month: 3,
      year: 2026,
      dateIndex: i,
    });
  });

  invoiceData.forEach((inv, i) => {
    const invoiceNo = inv.id.replace(/^#/, "");
    byNo.set(invoiceNo, {
      invoiceNo,
      plate: inv.plate,
      cls: inv.cls,
      route: inv.route,
      days: inv.days,
      net: inv.net,
      vat: inv.vat,
      total: inv.total,
      status: inv.status,
      period: "Mar 2026",
      month: 3,
      year: 2026,
      dateIndex: 200 + i,
    });
  });

  return Array.from(byNo.values());
}

async function tableCount(pool: Pool, table: string): Promise<number> {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0]?.c ?? 0;
}

async function seedRates(pool: Pool) {
  if (!force && (await tableCount(pool, "rates")) > 0) {
    console.log("rates: skip (already populated)");
    return;
  }
  if (force) await pool.query(`DELETE FROM rates`);

  const seen = new Set<string>();
  const rates: { route: string; cls: string; rate: number; category: string }[] = [];

  for (const [route, rate] of rates7T) {
    const cls = rateCls(route, "7T");
    const key = `${route}|${cls}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rates.push({ route, cls, rate, category: rateCategory(route) });
  }
  for (const [route, rate] of rates15T) {
    const key = `${route}|15T`;
    if (seen.has(key)) continue;
    seen.add(key);
    rates.push({ route, cls: "15T", rate, category: rateCategory(route) });
  }

  for (const r of rates) {
    await pool.query(
      `INSERT INTO rates (route, cls, rate, effective_from, status, category)
       VALUES ($1,$2,$3,'2026-01-01','active',$4)`,
      [r.route, r.cls, r.rate, r.category],
    );
  }
  console.log(`rates: ${rates.length} rows`);
}

async function seedRoutes(pool: Pool) {
  if (!force && (await tableCount(pool, "routes")) > 0) {
    console.log("routes: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM routes`);
  for (const d of destRevenue) {
    await pool.query(
      `INSERT INTO routes (name, rate7, rate15, category, trips, total, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active')`,
      [
        d.dest,
        d.rate7 ?? 0,
        d.rate15 ?? 0,
        d.dest.includes("NAIROBI") ? "nairobi" : "upcountry",
        d.trips,
        d.total,
      ],
    );
  }
  console.log(`routes: ${destRevenue.length} rows`);
}

async function seedVehicles(pool: Pool) {
  if (!force && (await tableCount(pool, "vehicles")) > 0) {
    console.log("vehicles: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM vehicles`);
  for (const v of vehicleRevenue) {
    const runType =
      v.dests.some((d) => d !== "NAIROBI" && d !== "NAIROBI AFTERNOON") &&
      v.dests.some((d) => d === "NAIROBI" || d === "NAIROBI AFTERNOON")
        ? "Both"
        : v.dests.some((d) => d === "NAIROBI" || d === "NAIROBI AFTERNOON")
          ? "Nairobi"
          : "Upcountry";
    await pool.query(
      `INSERT INTO vehicles (plate, cls, run_type, runs, days, total, dests, status, client)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'G4S Kenya')
       ON CONFLICT (plate) DO NOTHING`,
      [v.plate, v.cls, runType, v.runs, v.days, v.total, JSON.stringify(v.dests), v.status || "active"],
    );
  }
  console.log(`vehicles: ${vehicleRevenue.length} rows`);
}

async function seedSchedules(pool: Pool) {
  if (!force && (await tableCount(pool, "schedules")) > 0) {
    console.log("schedules: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM schedules`);
  let i = 0;
  for (const e of marchSchedule) {
    await pool.query(
      `INSERT INTO schedules (plate, cls, dest, run_type, rate, days, cost, vat, total, month, service_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Mar 2026',$10,'saved')`,
      [
        e.plate,
        e.cls,
        e.dest,
        e.runType,
        e.rate,
        e.days,
        e.cost,
        e.vat,
        e.total,
        seedServiceDate(i++, 2026, 3),
      ],
    );
  }
  console.log(`schedules: ${marchSchedule.length} rows`);
}

async function seedInvoices(pool: Pool): Promise<Map<string, string>> {
  const idByNo = new Map<string, string>();
  if (!force && (await tableCount(pool, "invoices")) > 0) {
    console.log("invoices: skip (loading existing ids)");
    const existing = await pool.query(`SELECT id, invoice_no FROM invoices`);
    for (const row of existing.rows) idByNo.set(row.invoice_no, row.id);
    return idByNo;
  }
  if (force) await pool.query(`DELETE FROM invoices`);

  const invoices = buildInvoiceSeed();
  for (const inv of invoices) {
    const id = randomUUID();
    idByNo.set(inv.invoiceNo, id);
    await pool.query(
      `INSERT INTO invoices (id, invoice_no, plate, cls, route, days, net, vat, total, status, service_date, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        inv.invoiceNo,
        inv.plate,
        inv.cls,
        inv.route,
        inv.days,
        inv.net,
        inv.vat,
        inv.total,
        inv.status,
        seedServiceDate(inv.dateIndex, inv.year, inv.month),
        inv.period,
      ],
    );
  }
  console.log(`invoices: ${invoices.length} rows`);
  return idByNo;
}

async function seedLocalDeliveries(pool: Pool) {
  if (!force && (await tableCount(pool, "local_deliveries")) > 0) {
    console.log("local_deliveries: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM local_deliveries`);
  let i = 0;
  for (const r of localData) {
    await pool.query(
      `INSERT INTO local_deliveries (reg, m, a, total, service_date, period)
       VALUES ($1,$2,$3,$4,$5,'Apr 2026')`,
      [r.reg, r.m, r.a, r.total, seedServiceDate(i++, 2026, 4)],
    );
  }
  console.log(`local_deliveries: ${localData.length} rows`);
}

async function seedSafari(pool: Pool) {
  if (!force && (await tableCount(pool, "safari_entries")) > 0) {
    console.log("safari_entries: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM safari_entries`);
  let i = 0;
  for (const r of safariData) {
    await pool.query(
      `INSERT INTO safari_entries (reg, total, flag, dest, service_date, period)
       VALUES ($1,$2,$3,$4,$5,'Apr 2026')`,
      [r.reg, r.total, r.flag, r.dest, seedServiceDate(i++, 2026, 4)],
    );
  }
  console.log(`safari_entries: ${safariData.length} rows`);
}

type WtSeed = {
  serialNo: string;
  tripDate: string;
  plate: string;
  make: string;
  vehicleType?: string;
  driverName: string;
  route: string;
  agreedRate: number;
  gatePassRef?: string;
  headerNotes?: string;
  legs: object[];
  vehicleCondition?: Record<string, string>;
  officialKm: number;
  driverSignature?: string;
  certificationDate?: string;
  status: string;
  consolidated?: boolean;
  alwaysRefresh?: boolean;
};

const WORK_TICKETS: WtSeed[] = [
  {
    serialNo: "1189100",
    tripDate: "2024-04-27",
    plate: "KDE 073Q",
    make: "Isuzu",
    vehicleType: "FRR 90",
    driverName: "Kennedy Priti 817",
    route: "Nairobi local",
    agreedRate: 8500,
    legs: [
      {
        id: "leg-1189100-1",
        details: "Base - Total - EDAS",
        openingMileage: 186250,
        timeOut: "0938",
        officerAuthorising: "J.M.",
        fuelDrawn: "",
        timeIn: "1017",
        closingMileage: 186253,
        journeyType: "S/S",
        officerConfirming: "J.M.",
      },
      {
        id: "leg-1189100-2",
        details: "Nyati HQ - Base",
        openingMileage: 186292,
        timeOut: "1215",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1838",
        closingMileage: 186330,
        journeyType: "S/S",
      },
      {
        id: "leg-1189100-3",
        details: "Base - CBD",
        openingMileage: 186330,
        timeOut: "1738",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1942",
        closingMileage: 186341,
        journeyType: "S/S",
      },
    ],
    vehicleCondition: {
      petrolDiesel: "Empty",
      oil: "OK",
      seatBelt: "OK",
      water: "OK",
      battery: "OK",
      tyres: "OK",
      safety: "OK",
      triangles: "OK",
      body: "OK",
      spareWheel: "OK",
      fireExtinguisher: "OK",
      tools: "OK",
    },
    officialKm: 91,
    driverSignature: "Kennedy Priti",
    certificationDate: "2024-04-27",
    status: "draft",
    alwaysRefresh: true,
  },
  {
    serialNo: "1189105",
    tripDate: "2026-01-05",
    plate: "KAV 038M",
    make: "Mitsubishi",
    driverName: "Hillary",
    route: "Nairobi local collection",
    agreedRate: 8500,
    headerNotes: "6 MORNING",
    legs: [
      {
        id: "leg-1",
        details: "Base — Total",
        openingMileage: 434488,
        timeOut: "0822",
        officerAuthorising: "",
        fuelDrawn: "20",
        timeIn: "",
        closingMileage: 434635,
        serviceType: "S/S",
      },
    ],
    officialKm: 147,
    status: "sent",
  },
  {
    serialNo: "1189107",
    tripDate: "2026-01-07",
    plate: "KAV 038M",
    make: "Mitsubishi",
    driverName: "Hillary",
    route: "Nairobi CBD runs",
    agreedRate: 8500,
    legs: [
      {
        id: "leg-1",
        details: "Base-JIO",
        openingMileage: 434488,
        timeOut: "0822",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1500",
        closingMileage: 434520,
        serviceType: "S/S",
      },
      {
        id: "leg-2",
        details: "Upper hill — Lang'ata — Ngong — Karen",
        openingMileage: 434520,
        timeOut: "1530",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1800",
        closingMileage: 434635,
        serviceType: "S/S",
      },
    ],
    officialKm: 147,
    status: "approved",
  },
  {
    serialNo: "1189109",
    tripDate: "2026-01-08",
    plate: "KAV 038M",
    make: "Mitsubishi",
    driverName: "Hillary",
    route: "Naivasha — Limuru — CBD",
    agreedRate: 14000,
    legs: [
      {
        id: "leg-1",
        details: "Base — Naivasha",
        openingMileage: 434635,
        timeOut: "0600",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1000",
        closingMileage: 434780,
        serviceType: "A/V",
      },
    ],
    officialKm: 145,
    status: "draft",
  },
  {
    serialNo: "1189201",
    tripDate: "2026-03-05",
    plate: "KBL 094E",
    make: "Mitsubishi",
    driverName: "Samuel",
    route: "Nairobi to Nakuru",
    agreedRate: 14000,
    gatePassRef: "GP-99210",
    legs: [
      {
        id: "leg-1",
        details: "Nairobi — Nakuru",
        openingMileage: 100100,
        timeOut: "0600",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1400",
        closingMileage: 100380,
        serviceType: "A/V",
      },
    ],
    officialKm: 280,
    status: "invoiced",
    consolidated: true,
  },
  {
    serialNo: "1189202",
    tripDate: "2026-03-12",
    plate: "KDE 073Q",
    make: "Isuzu",
    driverName: "James",
    route: "Nairobi Local",
    agreedRate: 8500,
    gatePassRef: "GP-99412",
    legs: [
      {
        id: "leg-1",
        details: "CBD collection",
        openingMileage: 200100,
        timeOut: "0800",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1700",
        closingMileage: 200165,
        serviceType: "S/S",
      },
    ],
    officialKm: 65,
    status: "invoiced",
    consolidated: true,
  },
  {
    serialNo: "1189203",
    tripDate: "2026-03-18",
    plate: "KBL 094E",
    make: "Mitsubishi",
    driverName: "Samuel",
    route: "Nairobi to Kisumu",
    agreedRate: 22000,
    gatePassRef: "GP-99850",
    legs: [
      {
        id: "leg-1",
        details: "Nairobi — Kisumu",
        openingMileage: 100380,
        timeOut: "0500",
        officerAuthorising: "",
        fuelDrawn: "",
        timeIn: "1800",
        closingMileage: 100720,
        serviceType: "A/V",
      },
    ],
    officialKm: 340,
    status: "invoiced",
    consolidated: true,
  },
];

async function seedWorkTickets(pool: Pool): Promise<{ consolidatedIds: string[]; idBySerial: Map<string, string> }> {
  const consolidatedIds: string[] = [];
  const idBySerial = new Map<string, string>();
  if (force) {
    await pool.query(`UPDATE work_tickets SET consolidated_invoice_id = NULL`);
    await pool.query(`DELETE FROM work_tickets`);
  }
  for (const wt of WORK_TICKETS) {
    const existing = await pool.query(`SELECT id FROM work_tickets WHERE serial_no = $1`, [wt.serialNo]);
    const amounts = calcWtAmounts(wt.agreedRate);
    const cond = JSON.stringify(
      wt.vehicleCondition ?? {
        petrolDiesel: "",
        oil: "",
        seatBelt: "",
        water: "",
        battery: "",
        tyres: "",
        safety: "",
        triangles: "",
        body: "",
        spareWheel: "",
        fireExtinguisher: "",
        tools: "",
      },
    );

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id as string;
      idBySerial.set(wt.serialNo, id);
      if (wt.consolidated) consolidatedIds.push(id);
      if (wt.alwaysRefresh) {
        await pool.query(
          `UPDATE work_tickets SET
            branch = 'Embakasi', trip_date = $2, plate = $3, make = $4, vehicle_type = $5,
            driver_name = $6, route = $7, agreed_rate = $8, gate_pass_ref = $9, header_notes = $10,
            legs = $11::jsonb, vehicle_condition = $12::jsonb, official_km = $13,
            net = $14, vat = $15, total = $16, driver_signature = $17, certification_date = $18,
            status = $19, updated_at = NOW()
           WHERE id = $1`,
          [
            id,
            wt.tripDate,
            wt.plate,
            wt.make,
            wt.vehicleType ?? null,
            wt.driverName,
            wt.route,
            wt.agreedRate,
            wt.gatePassRef ?? null,
            wt.headerNotes ?? null,
            JSON.stringify(wt.legs),
            cond,
            wt.officialKm,
            amounts.net,
            amounts.vat,
            amounts.total,
            wt.driverSignature ?? null,
            wt.certificationDate ?? null,
            wt.status,
          ],
        );
      }
      continue;
    }
    const id = randomUUID();
    await pool.query(
      `INSERT INTO work_tickets (
        id, serial_no, branch, trip_date, plate, make, vehicle_type, driver_name, route,
        rate_type, agreed_rate, gate_pass_ref, header_notes, legs, vehicle_condition,
        private_km, official_km, net, vat, total, driver_signature, certification_date, status
      ) VALUES ($1,$2,'Embakasi',$3,$4,$5,$6,$7,$8,'fixed',$9,$10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        wt.serialNo,
        wt.tripDate,
        wt.plate,
        wt.make,
        wt.vehicleType ?? null,
        wt.driverName,
        wt.route,
        wt.agreedRate,
        wt.gatePassRef ?? null,
        wt.headerNotes ?? null,
        JSON.stringify(wt.legs),
        cond,
        wt.officialKm,
        amounts.net,
        amounts.vat,
        amounts.total,
        wt.driverSignature ?? null,
        wt.certificationDate ?? null,
        wt.status,
      ],
    );
    idBySerial.set(wt.serialNo, id);
    if (wt.consolidated) consolidatedIds.push(id);
  }
  console.log(`work_tickets: ${WORK_TICKETS.length} ensured`);
  return { consolidatedIds, idBySerial };
}

async function seedConsolidatedInvoice(pool: Pool, workTicketIds: string[]) {
  if (workTicketIds.length === 0) return null;
  if (force) await pool.query(`DELETE FROM consolidated_invoices`);
  const existing = await pool.query(
    `SELECT id FROM consolidated_invoices WHERE invoice_no = 'INV-2026-03-G4S'`,
  );
  if (existing.rows.length > 0) {
    console.log("consolidated_invoices: skip");
    return existing.rows[0].id as string;
  }
  const marchNet = 14000 + 8500 + 22000;
  const marchVat = Math.round(marchNet * 0.16);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO consolidated_invoices (
      id, invoice_no, ref_no, period_start, period_end, invoice_date, description,
      payment_terms_days, total_trips, net, vat, total, status, work_ticket_ids
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,90,$8,$9,$10,$11,'pending_approval',$12)`,
    [
      id,
      "INV-2026-03-G4S",
      "101/03/26",
      "2026-03-01",
      "2026-03-31",
      "2026-04-04",
      "Provision of Lease Vehicles & Courier Services",
      workTicketIds.length,
      marchNet,
      marchVat,
      marchNet + marchVat,
      JSON.stringify(workTicketIds),
    ],
  );
  for (const wtId of workTicketIds) {
    await pool.query(`UPDATE work_tickets SET consolidated_invoice_id = $1 WHERE id = $2`, [id, wtId]);
  }
  console.log("consolidated_invoices: 1 row");
  return id;
}

async function seedExpenses(pool: Pool) {
  const rows = [
    ["2026-03-05", "fuel", "Fleet diesel — Nairobi depot", 485000, null, "Mar 2026", "paid"],
    ["2026-03-12", "maintenance", "KBH 667W — brake service", 42000, "KBH 667W", "Mar 2026", "approved"],
    ["2026-03-18", "insurance", "Commercial fleet cover — Q1", 320000, null, "Mar 2026", "paid"],
    ["2026-03-22", "salaries", "Driver wages — March", 890000, null, "Mar 2026", "recorded"],
    ["2026-02-08", "fuel", "Fleet diesel — February", 462000, null, "Feb 2026", "paid"],
    ["2026-01-15", "tolls", "Nairobi expressway passes", 78000, null, "Jan 2026", "paid"],
  ] as const;
  if (force) await pool.query(`DELETE FROM expenses`);
  let added = 0;
  for (const [date, cat, desc, amt, plate, month, status] of rows) {
    const exists = await pool.query(
      `SELECT 1 FROM expenses WHERE expense_date = $1 AND description = $2`,
      [date, desc],
    );
    if (!force && exists.rows.length > 0) continue;
    await pool.query(
      `INSERT INTO expenses (expense_date, category, description, amount, vehicle_plate, month, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [date, cat, desc, amt, plate, month, status],
    );
    added++;
  }
  console.log(`expenses: +${added} rows`);
}

async function seedBillingProfile(pool: Pool) {
  await pool.query(
    `UPDATE billing_profiles SET
      supplier = $1::jsonb,
      client = $2::jsonb,
      updated_at = NOW()
     WHERE id = (SELECT id FROM billing_profiles LIMIT 1)`,
    [
      JSON.stringify({
        name: "Road network transporters",
        address: "P.O. Box 4622-00200, Nairobi.",
        phone: "Tel: 020 2011330",
        vatNo: "0161681P",
        pin: "P051470271Y",
      }),
      JSON.stringify({
        name: "G4S COURIER",
        legalName: "G4S Courier Services Kenya Ltd",
        address: "G4S House, Waiyaki Way",
        city: "Nairobi, Kenya",
        pin: "P051987654G",
        contact: "Accounts Payable",
        email: "accounts@g4s.co.ke",
        contractRef: "G4S-RNT-2026-001",
      }),
    ],
  );
  console.log("billing_profiles: updated");
}

async function seedNotifications(pool: Pool) {
  if (!force && (await tableCount(pool, "workflow_notifications")) > 0) {
    console.log("workflow_notifications: skip");
    return;
  }
  if (force) await pool.query(`DELETE FROM workflow_notifications`);

  const now = Date.now();
  let count = 0;

  const pendingInvoices = await pool.query<{
    id: string;
    invoice_no: string;
    plate: string;
    route: string;
    total: number;
  }>(
    `SELECT id, invoice_no, plate, route, total FROM invoices
     WHERE status IN ('sent', 'pending')
     ORDER BY created_at DESC LIMIT 12`,
  );

  for (const [idx, inv] of pendingInvoices.rows.entries()) {
    await pool.query(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, read, actor, created_at)
       VALUES ('client','invoice_sent',$1,$2,$3,false,'admin',$4)`,
      [
        `Invoice ${inv.invoice_no} awaiting approval`,
        `${inv.plate} · ${inv.route} · KES ${Number(inv.total).toLocaleString()}`,
        inv.id,
        new Date(now - idx * 3600000).toISOString(),
      ],
    );
    count++;
  }

  const consolidated = await pool.query<{ id: string; invoice_no: string; total: number }>(
    `SELECT id, invoice_no, total FROM consolidated_invoices WHERE status = 'pending_approval' LIMIT 1`,
  );
  if (consolidated.rows[0]) {
    const ci = consolidated.rows[0];
    await pool.query(
      `INSERT INTO workflow_notifications (audience, type, title, message, ref_id, read, actor, created_at)
       VALUES ('client','consolidated_sent',$1,$2,$3,false,'admin',$4)`,
      [
        `Consolidated invoice ${ci.invoice_no} ready for review`,
        `KES ${Number(ci.total).toLocaleString()} · work tickets attached`,
        ci.id,
        new Date(now - count * 3600000).toISOString(),
      ],
    );
    count++;
  }

  console.log(`workflow_notifications: ${count} unread actionable rows`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(`SET search_path TO "${schema}"`);

  console.log(`Seeding demo data into ${schema} (force=${force})`);

  await seedRates(pool);
  await seedRoutes(pool);
  await seedVehicles(pool);
  await seedSchedules(pool);
  await seedInvoices(pool);
  await seedLocalDeliveries(pool);
  await seedSafari(pool);
  const { consolidatedIds } = await seedWorkTickets(pool);
  await seedConsolidatedInvoice(pool, consolidatedIds);
  await seedExpenses(pool);
  await seedBillingProfile(pool);
  await seedNotifications(pool);

  const counts = await pool.query(`
    SELECT 'schedules' t, COUNT(*)::int c FROM schedules
    UNION ALL SELECT 'vehicles', COUNT(*)::int FROM vehicles
    UNION ALL SELECT 'invoices', COUNT(*)::int FROM invoices
    UNION ALL SELECT 'rates', COUNT(*)::int FROM rates
    UNION ALL SELECT 'work_tickets', COUNT(*)::int FROM work_tickets
    UNION ALL SELECT 'expenses', COUNT(*)::int FROM expenses
    UNION ALL SELECT 'consolidated_invoices', COUNT(*)::int FROM consolidated_invoices
    UNION ALL SELECT 'workflow_notifications', COUNT(*)::int FROM workflow_notifications
  `);
  console.log("\nFinal counts:");
  for (const row of counts.rows) console.log(`  ${row.t}: ${row.c}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
