import { describe, expect, it } from "vitest";
import { cleanText, formatRunTime, mapsUrl, parseCapacity, runDefaults } from "@/lib/runDetails";

describe("runDetails", () => {
  it("defaults to 9:00 PM at Garden Grove Rec", () => {
    expect(runDefaults()).toEqual({
      capacity: 14,
      startTime: "21:00",
      locationName: "Garden Grove Rec",
      locationAddress: "13641 Deodara Dr, Garden Grove, CA 92844",
    });
  });

  it("formats 24h times for display", () => {
    expect(formatRunTime("20:00")).toBe("8:00 PM");
    expect(formatRunTime("07:05")).toBe("7:05 AM");
  });

  it("builds an encoded maps link from an address", () => {
    expect(mapsUrl("1 Gym Way, Town & Co")).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20Gym%20Way%2C%20Town%20%26%20Co",
    );
  });
});

describe("cleanText and parseCapacity", () => {
  it("trims text and turns blank into null", () => {
    expect(cleanText("  Gym ")).toBe("Gym");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(null)).toBeNull();
  });

  it("accepts whole numbers 1 to 99 only", () => {
    expect(parseCapacity("15")).toBe(15);
    expect(parseCapacity(" 1 ")).toBe(1);
    expect(parseCapacity("99")).toBe(99);
    for (const bad of ["0", "100", "-1", "1.5", "", "1e1", "abc", null]) {
      expect(parseCapacity(bad)).toBeNull();
    }
  });
});
