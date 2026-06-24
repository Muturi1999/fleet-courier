import { ConflictException } from "@nestjs/common";
import { normalizePlate } from "./vehicle-fleet.helper";

/** Stable prefix — keep in sync with src/lib/vehicle-messages.ts */
export const VEHICLE_ALREADY_EXISTS_PREFIX = "VEHICLE_ALREADY_EXISTS";

export function vehicleAlreadyExistsApiMessage(plate: string): string {
  return `${VEHICLE_ALREADY_EXISTS_PREFIX}: ${normalizePlate(plate)}`;
}

export function vehiclePlateConflict(plate: string): ConflictException {
  return new ConflictException(vehicleAlreadyExistsApiMessage(plate));
}
