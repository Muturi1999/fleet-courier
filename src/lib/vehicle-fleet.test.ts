import { describe, expect, it } from "vitest";
import {
  clsFromLabel,
  formatPlateInput,
  normalizeCls,
  normalizePlate,
} from "./vehicle-fleet";

describe("normalizePlate", () => {
  it("uppercases and collapses spaces", () => {
    expect(normalizePlate("  kav 038n  ")).toBe("KAV 038N");
    expect(normalizePlate("KAV038N")).toBe("KAV038N");
  });
});

describe("formatPlateInput", () => {
  it("formats Kenyan plates as users type", () => {
    expect(formatPlateInput("kav038n")).toBe("KAV 038N");
    expect(formatPlateInput("KAV")).toBe("KAV");
    expect(formatPlateInput("kav-038n")).toBe("KAV 038N");
  });
});

describe("normalizeCls", () => {
  it("maps PDF labels to stored class codes", () => {
    expect(normalizeCls("7 Tonnes Truck")).toBe("7T");
    expect(normalizeCls("15 Tonnes Truck")).toBe("15T");
    expect(normalizeCls("4 Tonnes Truck (Canter)")).toBe("Canter");
    expect(normalizeCls("1 Tonne Truck (Van)")).toBe("Van");
  });

  it("preserves canonical codes", () => {
    expect(normalizeCls("7T")).toBe("7T");
    expect(normalizeCls("Canter")).toBe("Canter");
  });
});

describe("clsFromLabel", () => {
  it("defaults unknown labels to 7T", () => {
    expect(clsFromLabel("unknown")).toBe("7T");
  });
});
