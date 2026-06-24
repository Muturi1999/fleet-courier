import { describe, expect, it } from "vitest";
import { parseApiErrorBody, saveErrorMessage } from "./api-errors";

describe("parseApiErrorBody", () => {
  it("reads NestJS validation arrays", () => {
    expect(parseApiErrorBody({ message: ["plate must be a string", "runType required"] })).toBe(
      "plate must be a string, runType required",
    );
  });

  it("reads conflict messages", () => {
    expect(parseApiErrorBody({ message: "Vehicle KAV 038N is already registered" })).toBe(
      "Vehicle KAV 038N is already registered",
    );
  });

  it("falls back when body is empty", () => {
    expect(parseApiErrorBody(null, "Save failed")).toBe("Save failed");
  });
});

describe("saveErrorMessage", () => {
  it("surfaces Error.message from useCrud", () => {
    expect(saveErrorMessage(new Error("Vehicle KAV 038N is already registered"))).toBe(
      "Vehicle KAV 038N is already registered",
    );
  });

  it("uses fallback for unknown errors", () => {
    expect(saveErrorMessage("oops")).toBe("Save failed");
  });
});
