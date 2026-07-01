import type { WorkTicket, WorkTicketJourneyLeg, WorkTicketVehicleCondition } from "./types";

export const G4S_CLIENT = {
  name: "G4S Kenya Limited",
  defaultBranch: "Embakasi",
} as const;

export const DRIVER_OPTIONS = [
  "Hillary",
  "Samuel",
  "James",
  "Peter",
  "Joseph",
] as const;

export const VEHICLE_MAKE_BY_PLATE: Record<string, string> = {
  "KAV 038M": "Mitsubishi",
  "KAV 038N": "Isuzu",
  "KBL 094E": "Mitsubishi",
  "KDE 073Q": "Isuzu",
};

export const VEHICLE_TYPE_BY_PLATE: Record<string, string> = {
  "KDE 073Q": "FRR 90",
  "KAV 038N": "FRR",
};

export const WORK_TICKET_CONDITION_CHECKS: { key: keyof WorkTicketVehicleCondition; label: string }[] = [
  { key: "petrolDiesel", label: "Petrol / Diesel" },
  { key: "oil", label: "Oil" },
  { key: "seatBelt", label: "Seat belt" },
  { key: "water", label: "Water" },
  { key: "battery", label: "Battery" },
  { key: "tyres", label: "Tyres" },
  { key: "safety", label: "Safety" },
  { key: "triangles", label: "Triangles" },
  { key: "body", label: "Body" },
  { key: "spareWheel", label: "Spare wheel" },
  { key: "fireExtinguisher", label: "Fire extinguisher" },
  { key: "tools", label: "Tools" },
];

export const WORK_TICKET_SERIES_START = 1189100;

export function generateWorkTicketSerial(existing: { serialNo: string }[], prefix = ""): string {
  let max = WORK_TICKET_SERIES_START - 1;
  for (const t of existing) {
    const n = parseInt(t.serialNo.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

import { formatEATDisplay, dateKey } from "./dates";

export function formatG4sDate(iso?: string): string {
  if (!iso) return "";
  const key = dateKey(iso);
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return formatEATDisplay(iso);
  return `${d}/${m}/${y.slice(-2)}`;
}

/** Display HHMM as HH:MM on the paper ticket. */
export function formatG4sTime(value?: string): string {
  const raw = (value ?? "").replace(/\D/g, "");
  if (raw.length < 3) return value ?? "";
  const padded = raw.padStart(4, "0").slice(-4);
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

export function legDistance(leg: WorkTicketJourneyLeg): number {
  if (!leg.closingMileage || !leg.openingMileage) return 0;
  const d = leg.closingMileage - leg.openingMileage;
  return d > 0 ? d : 0;
}

export function sumLegDistances(legs: WorkTicketJourneyLeg[]): number {
  return legs.reduce((sum, leg) => sum + legDistance(leg), 0);
}

export function calcWorkTicketAmounts(agreedRate: number) {
  const net = Math.round(agreedRate);
  const vat = Math.round(net * 0.16);
  return { net, vat, total: net + vat };
}

export function resolveOfficialKm(ticket: Pick<WorkTicket, "legs" | "officialKm" | "privateKm">): number {
  if (ticket.officialKm > 0) return ticket.officialKm;
  return sumLegDistances(ticket.legs);
}

export function resolveTotalKm(ticket: Pick<WorkTicket, "legs" | "officialKm" | "privateKm">): number {
  return resolveOfficialKm(ticket) + (ticket.privateKm || 0);
}

export function emptyVehicleCondition(): WorkTicketVehicleCondition {
  return {
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
  };
}

export function emptyJourneyLeg(): WorkTicketJourneyLeg {
  return {
    id: crypto.randomUUID(),
    details: "",
    openingMileage: 0,
    timeOut: "",
    officerAuthorising: "",
    fuelDrawn: "",
    timeIn: "",
    closingMileage: 0,
    serviceDone: "",
    officerConfirming: "",
    journeyType: "",
  };
}

/** Map legacy leg JSON (serviceType) to journeyType. */
export function normalizeJourneyLeg(leg: Partial<WorkTicketJourneyLeg> & { serviceType?: string }): WorkTicketJourneyLeg {
  const base = emptyJourneyLeg();
  return {
    ...base,
    ...leg,
    id: leg.id ?? base.id,
    journeyType: leg.journeyType ?? leg.serviceType ?? "",
    serviceDone: leg.serviceDone ?? "",
    officerConfirming: leg.officerConfirming ?? "",
  };
}

export function normalizeVehicleCondition(raw?: Partial<WorkTicketVehicleCondition> | null): WorkTicketVehicleCondition {
  return { ...emptyVehicleCondition(), ...(raw ?? {}) };
}

/** Paper-form reference ticket (serial 1189100) — KDE 073Q / Embakasi sample. */
export function referenceWorkTicket1189100(id = "wt-reference-1189100"): WorkTicket {
  const amounts = calcWorkTicketAmounts(8500);
  return {
    id,
    serialNo: "1189100",
    branch: "Embakasi",
    tripDate: "2024-04-27",
    plate: "KDE 073Q",
    make: "Isuzu",
    vehicleType: "FRR 90",
    driverName: "Kennedy Priti 817",
    route: "Nairobi local",
    rateType: "fixed",
    agreedRate: 8500,
    headerNotes: "",
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
        serviceDone: "",
        officerConfirming: "J.M.",
        journeyType: "S/S",
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
        serviceDone: "",
        officerConfirming: "",
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
        serviceDone: "",
        officerConfirming: "",
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
    privateKm: 0,
    officialKm: 91,
    driverSignature: "Kennedy Priti",
    certificationDate: "2024-04-27",
    ...amounts,
    status: "draft",
  };
}
