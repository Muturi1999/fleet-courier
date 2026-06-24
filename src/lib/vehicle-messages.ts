import { normalizePlate } from "./vehicle-fleet";

/** User-facing vehicle registration messages — keep in sync with backend ConflictException text. */
export const VEHICLE_ALREADY_EXISTS_PREFIX = "VEHICLE_ALREADY_EXISTS";

export function vehicleSavedMessage(plate: string): string {
  return `${normalizePlate(plate)} saved successfully`;
}

export function vehicleUpdatedMessage(plate: string): string {
  return `${normalizePlate(plate)} updated successfully`;
}

export const VEHICLE_ALREADY_EXISTS_MESSAGE = "Already exists";

export function vehicleAlreadyExistsMessage(): string {
  return VEHICLE_ALREADY_EXISTS_MESSAGE;
}

/** Backend conflict body — stable prefix for clients that only read message strings. */
export function vehicleAlreadyExistsApiMessage(plate: string): string {
  return `${VEHICLE_ALREADY_EXISTS_PREFIX}: ${normalizePlate(plate)}`;
}

export function parseVehicleAlreadyExists(message: string): string | null {
  const trimmed = message.trim();
  const prefixed = trimmed.match(/^VEHICLE_ALREADY_EXISTS:\s*(.+)$/i);
  if (prefixed) return normalizePlate(prefixed[1]);

  const lower = trimmed.toLowerCase();
  if (lower.includes("already exists") || lower.includes("already registered")) {
    const match = trimmed.match(/([A-Z]{3}\s?[A-Z0-9]+)/i);
    if (match) return normalizePlate(match[1]);
  }
  return null;
}

export function isVehicleAlreadyExistsError(message: string): boolean {
  return parseVehicleAlreadyExists(message) !== null;
}

export function vehicleSaveFailureMessage(error: unknown, plate: string): string {
  const normalized = normalizePlate(plate);
  if (error instanceof Error) {
    const duplicatePlate = parseVehicleAlreadyExists(error.message);
    if (duplicatePlate) return vehicleAlreadyExistsMessage();
    if (error.message.trim()) return error.message;
  }
  return `Could not save ${normalized} — please try again`;
}

export function findVehicleByPlate(vehicles: { id: string; plate: string }[], plate: string, exceptId?: string) {
  const target = normalizePlate(plate).replace(/\s/g, "").toLowerCase();
  return vehicles.find(
    (v) =>
      v.id !== exceptId &&
      normalizePlate(v.plate).replace(/\s/g, "").toLowerCase() === target,
  );
}
