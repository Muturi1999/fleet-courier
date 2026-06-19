import {
  destRevenue,
  invoiceData,
  localData,
  marchSchedule,
  safariData,
  vehicleRevenue,
} from "./data/mock-data";
import type {
  ConsolidatedInvoice,
  Expense,
  FleetData,
  Invoice,
  LocalDelivery,
  Rate,
  RouteRecord,
  SafariEntry,
  ScheduleEntry,
  Vehicle,
  WorkTicket,
} from "./types";
import { calcWorkTicketAmounts } from "./work-ticket-meta";
import { DEFAULT_BILLING_PROFILE } from "./invoice-meta";
import { seedServiceDate } from "./filters";
import { seedNotificationsFromInvoices } from "./workflows";

let idCounter = 0;
function nid(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function buildSeedData(): FleetData {
  idCounter = 0;

  const schedules: ScheduleEntry[] = marchSchedule.map((e, i) => ({
    id: nid("sch"),
    plate: e.plate,
    cls: e.cls,
    dest: e.dest,
    runType: e.runType as "Morning" | "Afternoon",
    rate: e.rate,
    days: e.days,
    cost: e.cost,
    vat: e.vat,
    total: e.total,
    month: "Mar 2026",
    serviceDate: seedServiceDate(i, 2026, 3),
    status: "saved",
  }));

  const vehicles: Vehicle[] = vehicleRevenue.map((v) => ({
    id: nid("veh"),
    plate: v.plate,
    cls: v.cls,
    runType:
      v.dests.some((d) => d !== "NAIROBI" && d !== "NAIROBI AFTERNOON") &&
      v.dests.some((d) => d === "NAIROBI" || d === "NAIROBI AFTERNOON")
        ? "Both"
        : v.dests.some((d) => d === "NAIROBI" || d === "NAIROBI AFTERNOON")
          ? "Nairobi"
          : "Upcountry",
    runs: v.runs,
    days: v.days,
    total: v.total,
    dests: v.dests,
    status: (v.status as Vehicle["status"]) || "active",
    client: "G4S Kenya",
  }));

  const invoices: Invoice[] = invoiceData.map((inv, i) => ({
    id: nid("inv"),
    invoiceNo: String(19299 + i),
    plate: inv.plate,
    cls: inv.cls,
    route: inv.route,
    days: inv.days,
    net: inv.net,
    vat: inv.vat,
    total: inv.total,
    status: inv.status as Invoice["status"],
    serviceDate: seedServiceDate(i, 2026, 3),
    period: "Mar 2026",
  }));

  const rates: Rate[] = [
    { id: nid("rate"), route: "Nairobi Morning (full day)", cls: "7T", rate: 8500, effectiveFrom: "2026-01-01", status: "active", category: "nairobi" },
    { id: nid("rate"), route: "Nairobi Afternoon (half day)", cls: "7T", rate: 7000, effectiveFrom: "2026-01-01", status: "active", category: "nairobi" },
    { id: nid("rate"), route: "Nairobi Morning (full day)", cls: "15T", rate: 9000, effectiveFrom: "2026-01-01", status: "active", category: "nairobi" },
    { id: nid("rate"), route: "Canter Nairobi", cls: "Canter", rate: 5800, effectiveFrom: "2026-01-01", status: "active", category: "nairobi" },
    { id: nid("rate"), route: "Van Nairobi", cls: "Van", rate: 5300, effectiveFrom: "2026-01-01", status: "active", category: "nairobi" },
    { id: nid("rate"), route: "Nakuru", cls: "7T", rate: 14000, effectiveFrom: "2026-01-01", status: "active", category: "upcountry" },
    { id: nid("rate"), route: "Mombasa", cls: "7T", rate: 26000, effectiveFrom: "2026-01-01", status: "active", category: "upcountry" },
    { id: nid("rate"), route: "Kisumu", cls: "7T", rate: 22000, effectiveFrom: "2026-01-01", status: "active", category: "upcountry" },
    { id: nid("rate"), route: "Eldoret", cls: "7T", rate: 22000, effectiveFrom: "2026-01-01", status: "active", category: "upcountry" },
    { id: nid("rate"), route: "Meru", cls: "7T", rate: 22000, effectiveFrom: "2026-01-01", status: "active", category: "upcountry" },
  ];

  const localDeliveries: LocalDelivery[] = localData.map((r, i) => ({
    id: nid("loc"),
    reg: r.reg,
    m: r.m,
    a: r.a,
    total: r.total,
    serviceDate: seedServiceDate(i, 2026, 4),
    period: "Apr 2026",
  }));

  const safari: SafariEntry[] = safariData.map((r, i) => ({
    id: nid("saf"),
    reg: r.reg,
    total: r.total,
    flag: r.flag as SafariEntry["flag"],
    dest: r.dest,
    serviceDate: seedServiceDate(i, 2026, 4),
    period: "Apr 2026",
  }));

  const routes: RouteRecord[] = destRevenue.map((d) => ({
    id: nid("route"),
    name: d.dest,
    rate7: d.rate7 ?? 0,
    rate15: d.rate15 ?? 0,
    category:
      d.dest.includes("NAIROBI") ? "nairobi" : "upcountry",
    trips: d.trips,
    total: d.total,
    status: "active" as const,
  }));

  const notifications = seedNotificationsFromInvoices(invoices);

  const wtAmount = calcWorkTicketAmounts(8500);
  const workTickets: WorkTicket[] = [
    {
      id: nid("wt"),
      serialNo: "1189105",
      branch: "Embakasi",
      tripDate: "2026-01-05",
      plate: "KAV 038M",
      make: "Mitsubishi",
      driverName: "Hillary",
      route: "Nairobi local collection",
      rateType: "fixed",
      agreedRate: 8500,
      gatePassRef: "B090975/62",
      headerNotes: "6 MORNING",
      legs: [
        {
          id: nid("leg"),
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
      privateKm: 0,
      officialKm: 147,
      ...wtAmount,
      status: "sent",
    },
    {
      id: nid("wt"),
      serialNo: "1189107",
      branch: "Embakasi",
      tripDate: "2026-01-07",
      plate: "KAV 038M",
      make: "Mitsubishi",
      driverName: "Hillary",
      route: "Nairobi CBD runs",
      rateType: "fixed",
      agreedRate: 8500,
      legs: [
        {
          id: nid("leg"),
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
          id: nid("leg"),
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
      privateKm: 0,
      officialKm: 147,
      ...wtAmount,
      status: "approved",
    },
    {
      id: nid("wt"),
      serialNo: "1189109",
      branch: "Embakasi",
      tripDate: "2026-01-08",
      plate: "KAV 038M",
      make: "Mitsubishi",
      driverName: "Hillary",
      route: "Naivasha — Limuru — CBD",
      rateType: "fixed",
      agreedRate: 14000,
      legs: [
        {
          id: nid("leg"),
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
      privateKm: 0,
      officialKm: 145,
      ...calcWorkTicketAmounts(14000),
      status: "draft",
    },
    {
      id: nid("wt"),
      serialNo: "1189201",
      branch: "Embakasi",
      tripDate: "2026-03-05",
      plate: "KBL 094E",
      make: "Mitsubishi",
      driverName: "Samuel",
      route: "Nairobi to Nakuru",
      rateType: "fixed",
      agreedRate: 14000,
      gatePassRef: "GP-99210",
      legs: [{ id: nid("leg"), details: "Nairobi — Nakuru", openingMileage: 100100, timeOut: "0600", officerAuthorising: "", fuelDrawn: "", timeIn: "1400", closingMileage: 100380, serviceType: "A/V" }],
      privateKm: 0,
      officialKm: 280,
      ...calcWorkTicketAmounts(14000),
      status: "invoiced",
      consolidatedInvoiceId: "seed-consolidated-march",
    },
    {
      id: nid("wt"),
      serialNo: "1189202",
      branch: "Embakasi",
      tripDate: "2026-03-12",
      plate: "KDE 073Q",
      make: "Isuzu",
      driverName: "James",
      route: "Nairobi Local",
      rateType: "fixed",
      agreedRate: 8500,
      gatePassRef: "GP-99412",
      legs: [{ id: nid("leg"), details: "CBD collection", openingMileage: 200100, timeOut: "0800", officerAuthorising: "", fuelDrawn: "", timeIn: "1700", closingMileage: 200165, serviceType: "S/S" }],
      privateKm: 0,
      officialKm: 65,
      ...calcWorkTicketAmounts(8500),
      status: "invoiced",
      consolidatedInvoiceId: "seed-consolidated-march",
    },
    {
      id: nid("wt"),
      serialNo: "1189203",
      branch: "Embakasi",
      tripDate: "2026-03-18",
      plate: "KBL 094E",
      make: "Mitsubishi",
      driverName: "Samuel",
      route: "Nairobi to Kisumu",
      rateType: "fixed",
      agreedRate: 22000,
      gatePassRef: "GP-99850",
      legs: [{ id: nid("leg"), details: "Nairobi — Kisumu", openingMileage: 100380, timeOut: "0500", officerAuthorising: "", fuelDrawn: "", timeIn: "1800", closingMileage: 100720, serviceType: "A/V" }],
      privateKm: 0,
      officialKm: 340,
      ...calcWorkTicketAmounts(22000),
      status: "invoiced",
      consolidatedInvoiceId: "seed-consolidated-march",
    },
  ];

  const marchNet = 14000 + 8500 + 22000;
  const marchVat = Math.round(marchNet * 0.16);
  const consolidatedInvoices: ConsolidatedInvoice[] = [
    {
      id: "seed-consolidated-march",
      invoiceNo: "INV-2026-03-G4S",
      refNo: "101/03/26",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      invoiceDate: "2026-04-04",
      description: "Provision of Lease Vehicles & Courier Services",
      paymentTermsDays: 90,
      totalTrips: 3,
      net: marchNet,
      vat: marchVat,
      total: marchNet + marchVat,
      status: "pending_approval",
      workTicketIds: workTickets.filter((t) => t.consolidatedInvoiceId === "seed-consolidated-march").map((t) => t.id),
    },
  ];

  const expenses: Expense[] = [
    { id: nid("exp"), date: "2026-03-05", category: "fuel", description: "Fleet diesel — Nairobi depot", amount: 485000, month: "Mar 2026", status: "paid" },
    { id: nid("exp"), date: "2026-03-12", category: "maintenance", description: "KBH 667W — brake service", amount: 42000, vehiclePlate: "KBH 667W", month: "Mar 2026", status: "approved" },
    { id: nid("exp"), date: "2026-03-18", category: "insurance", description: "Commercial fleet cover — Q1", amount: 320000, month: "Mar 2026", status: "paid" },
    { id: nid("exp"), date: "2026-03-22", category: "salaries", description: "Driver wages — March", amount: 890000, month: "Mar 2026", status: "recorded" },
    { id: nid("exp"), date: "2026-02-08", category: "fuel", description: "Fleet diesel — February", amount: 462000, month: "Feb 2026", status: "paid" },
    { id: nid("exp"), date: "2026-01-15", category: "tolls", description: "Nairobi expressway passes", amount: 78000, month: "Jan 2026", status: "paid" },
  ];

  return {
    schedules,
    vehicles,
    invoices,
    rates,
    localDeliveries,
    safari,
    routes,
    workTickets,
    consolidatedInvoices,
    notifications,
    expenses,
    billingProfile: DEFAULT_BILLING_PROFILE,
  };
}
