import { describe, expect, it } from "vitest";
import { parseApiErrorBody, saveErrorMessage } from "./api-errors";

describe("parseApiErrorBody", () => {
  it("reads NestJS validation arrays", () => {
    expect(parseApiErrorBody({ message: ["plate must be a string", "runType required"] })).toBe(
      "plate must be a string, runType required",
    );
  });

  it("reads conflict messages with stable prefix", () => {
    expect(parseApiErrorBody({ message: "VEHICLE_ALREADY_EXISTS: KAV 038N" })).toBe(
      "VEHICLE_ALREADY_EXISTS: KAV 038N",
    );
  });

  it("falls back when body is empty", () => {
    expect(parseApiErrorBody(null, "Save failed")).toBe("Save failed");
  });
});

describe("saveErrorMessage", () => {
  it("surfaces Error.message from useCrud", () => {
    expect(saveErrorMessage(new Error("VEHICLE_ALREADY_EXISTS: KAV 038N"))).toBe(
      "VEHICLE_ALREADY_EXISTS: KAV 038N",
    );
  });

  it("uses fallback for unknown errors", () => {
    expect(saveErrorMessage("oops")).toBe("Save failed");
  });
});
