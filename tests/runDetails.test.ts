import { describe, expect, it } from "vitest";
import { formatRunTime, mapsUrl, runDefaults } from "@/lib/runDetails";

describe("runDetails", () => {
  it("defaults to 9:00 PM at Garden Grove Rec", () => {
    expect(runDefaults()).toEqual({
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
