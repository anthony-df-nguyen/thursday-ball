import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRunDate, formatRunDateLong, nextThursdayISO, todayISO } from "@/lib/dates";

afterEach(() => vi.useRealTimers());

describe("nextThursdayISO", () => {
  it("returns the coming Thursday from midweek", () => {
    vi.useFakeTimers({ now: new Date("2026-10-21T12:00:00Z") }); // Wednesday
    expect(nextThursdayISO()).toBe("2026-10-22");
  });

  it("skips to next week when today is Thursday", () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    expect(nextThursdayISO()).toBe("2026-10-29");
  });

  it("rolls over from Friday", () => {
    vi.useFakeTimers({ now: new Date("2026-10-23T12:00:00Z") });
    expect(nextThursdayISO()).toBe("2026-10-29");
  });
});

describe("formatRunDate", () => {
  it("formats short and long variants", () => {
    expect(formatRunDate("2026-10-22")).toEqual({ date: "Oct 22, 2026", weekday: "Thursday" });
    expect(formatRunDateLong("2026-10-22")).toEqual({ date: "October 22, 2026", weekday: "Thursday" });
  });
});

describe("todayISO", () => {
  it("uses the app timezone, not UTC", () => {
    // 03:00 UTC Friday is still Thursday evening in Los Angeles.
    expect(todayISO(new Date("2026-10-23T03:00:00Z"))).toBe("2026-10-22");
    expect(todayISO(new Date("2026-10-23T08:00:00Z"))).toBe("2026-10-23");
  });
});
