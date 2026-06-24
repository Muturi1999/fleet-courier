import { describe, expect, it } from "vitest";
import {
  findVehicleByPlate,
  isVehicleAlreadyExistsError,
  parseVehicleAlreadyExists,
  vehicleAlreadyExistsMessage,
  vehicleSaveFailureMessage,
  vehicleSavedMessage,
  VEHICLE_ALREADY_EXISTS_PREFIX,
} from "./vehicle-messages";

describe("vehicle messages", () => {
  it("formats a definite success message with plate", () => {
    expect(vehicleSavedMessage("kav 038n")).toBe("KAV 038N saved successfully");
  });

  it("uses a short duplicate message only", () => {
    expect(vehicleAlreadyExistsMessage()).toBe("Already exists");
  });

  it("parses backend conflict prefix", () => {
    expect(parseVehicleAlreadyExists(`${VEHICLE_ALREADY_EXISTS_PREFIX}: KAV 038N`)).toBe("KAV 038N");
    expect(isVehicleAlreadyExistsError(`${VEHICLE_ALREADY_EXISTS_PREFIX}: KAV 038N`)).toBe(true);
  });

  it("finds duplicate plates case-insensitively", () => {
    const fleet = [{ id: "1", plate: "KAV 038N" }];
    expect(findVehicleByPlate(fleet, "kav038n")?.id).toBe("1");
    expect(findVehicleByPlate(fleet, "kav038n", "1")).toBeUndefined();
  });

  it("maps API duplicate errors to user message", () => {
    expect(
      vehicleSaveFailureMessage(new Error("VEHICLE_ALREADY_EXISTS: KAV 038N"), "KAV 038N"),
    ).toBe("Already exists");
  });
});
