import type { WorkTicket, WorkTicketJourneyLeg } from "./types";

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

export const WORK_TICKET_SERIES_START = 1189100;

export function generateWorkTicketSerial(existing: { serialNo: string }[], prefix = ""): string {
  let max = WORK_TICKET_SERIES_START - 1;
  for (const t of existing) {
    const n = parseInt(t.serialNo.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

import { formatEATDisplay } from "./dates";

export function formatG4sDate(iso?: string): string {
  return formatEATDisplay(iso);
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
    serviceType: "",
  };
}
