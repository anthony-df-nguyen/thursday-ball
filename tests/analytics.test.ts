import { describe, expect, it } from "vitest";
import {
  personDistinctId,
  scrubEventProperties,
  scrubRsvpTokens,
} from "@/lib/analytics";

const TOKEN = "3f2b8c1e-9a4d-4e7b-8c15-0d2f6a9b7e41";

describe("personDistinctId", () => {
  it("uses the roster id when there is one", () => {
    expect(personDistinctId({ regularId: "reg", attendeeId: "att" })).toBe("reg");
  });
  it("falls back to the attendee row for ad-hoc or deleted regulars", () => {
    expect(personDistinctId({ regularId: null, attendeeId: "att" })).toBe("att");
  });
});

describe("scrubRsvpTokens", () => {
  it("replaces the token in URLs and paths", () => {
    expect(scrubRsvpTokens(`https://x.app/rsvp/${TOKEN}?r=yes`)).toBe(
      "https://x.app/rsvp/[token]?r=yes",
    );
    expect(scrubRsvpTokens(`/rsvp/${TOKEN}`)).toBe("/rsvp/[token]");
  });
  it("leaves other strings alone", () => {
    expect(scrubRsvpTokens("/events/abc")).toBe("/events/abc");
  });
});

describe("scrubEventProperties", () => {
  it("scrubs string properties and keeps the rest", () => {
    expect(
      scrubEventProperties({
        $current_url: `https://x.app/rsvp/${TOKEN}`,
        $pathname: `/rsvp/${TOKEN}`,
        count: 2,
      }),
    ).toEqual({
      $current_url: "https://x.app/rsvp/[token]",
      $pathname: "/rsvp/[token]",
      count: 2,
    });
  });
  it("passes undefined through", () => {
    expect(scrubEventProperties(undefined)).toBeUndefined();
  });
});
