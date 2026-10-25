import { describe, expect, it } from "vitest";
import { PAYEES, cashAppUrl, venmoUrl } from "@/lib/payment";

describe("payment links", () => {
  it("builds a Venmo profile URL and encodes the handle", () => {
    expect(venmoUrl("UmerMemon")).toBe("https://account.venmo.com/u/UmerMemon");
    expect(venmoUrl("a b/c")).toBe("https://account.venmo.com/u/a%20b%2Fc");
  });

  it("builds a Cash App URL and keeps the $", () => {
    expect(cashAppUrl("$MemonManagement")).toBe("https://cash.app/$MemonManagement");
  });
});

describe("PAYEES", () => {
  it("has unique names", () => {
    const names = PAYEES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives everyone at least one payment method", () => {
    for (const p of PAYEES) {
      expect(p.venmo || p.zelle || p.cashApp, p.name).toBeTruthy();
    }
  });
});
