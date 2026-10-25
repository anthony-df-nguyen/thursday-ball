import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, events } from "@/db/schema";
import RsvpPage, { generateMetadata } from "@/app/rsvp/[token]/page";
import OgImage from "@/app/rsvp/[token]/opengraph-image";
import { todayISO } from "@/lib/dates";
import { makeAttendee, makeEvent, makePlusOne, resetDb, seedOrganizer } from "./helpers";

const FUTURE = "2999-01-01";

async function tokenOf(id: string) {
  const row = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, id) });
  return row!.rsvpToken;
}

async function render(token: string, r?: string) {
  const ui = await RsvpPage({
    params: Promise.resolve({ token }),
    searchParams: Promise.resolve(r ? { r } : {}),
  } as never);
  return renderToStaticMarkup(ui);
}

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("RSVP page", () => {
  // Skipped while the "Who's Confirmed" card is hidden on the page (see the
  // "Hide this for now" comment in rsvp/[token]/page.tsx). Re-enable with it.
  it.skip("lists who's in, with their confirmed +1s, and the cap", async () => {
    const e = await makeEvent(FUTURE, { capacity: 15 });
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const a = await makeAttendee(e.id, { displayName: "Alice" }, "confirmed");
    await makePlusOne(a.id, "confirmed");
    await makeAttendee(e.id, { displayName: "Declan" }, "declined");

    const html = await render(await tokenOf(me.id));
    expect(html).toContain("Who&#x27;s Confirmed (2 / 15)");
    expect(html).toContain("Alice");
    expect(html).toContain("Alice&#x27;s +1");
    expect(html).not.toContain("Declan");
  });

  // Skipped while the "Who's Confirmed" card is hidden on the page (see the
  // "Hide this for now" comment in rsvp/[token]/page.tsx). Re-enable with it.
  it.skip("counts Asked people and Asked +1s as pending", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    await makeAttendee(e.id, { displayName: "B" });
    const c = await makeAttendee(e.id, { displayName: "C" }, "confirmed");
    await makePlusOne(c.id, "invited");
    await makePlusOne(c.id, "confirmed");

    const html = await render(await tokenOf(me.id));
    expect(html).toContain("Waiting to hear back from 3 people");
  });

  it("shows 'No response yet' while their status is still Asked", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const yes = await makeAttendee(e.id, { displayName: "Yes" }, "confirmed");
    expect(await render(await tokenOf(me.id))).toContain("Your RSVP Status</span><span");
    expect(await render(await tokenOf(me.id))).toContain("No response yet");
    const yesHtml = await render(await tokenOf(yes.id));
    expect(yesHtml).toContain("Your RSVP Status</span><span");
    expect(yesHtml).toContain("You&#x27;re in");
  });

  it("doesn't repeat a yes/no result as a message; the Your RSVP Status card is enough", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" }, "confirmed");
    const html = await render(await tokenOf(me.id), "yes");
    expect(html).toContain("You&#x27;re in");
    expect(html).not.toContain("See you there");
    expect(html).not.toContain('role="alert"');
    const no = await makeAttendee(e.id, { displayName: "No" }, "declined");
    const noHtml = await render(await tokenOf(no.id), "no");
    expect(noHtml).toContain("You&#x27;re out");
    expect(noHtml).not.toContain("Thanks for letting us know");
  });

  // Skipped while the "Who's Confirmed" card is hidden on the page (see the
  // "Hide this for now" comment in rsvp/[token]/page.tsx). Re-enable with it.
  it.skip("uses singular for one pending person", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("from 1 person");
  });

  it("shows the full message as a red alert", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id), "full");
    expect(html).toContain('role="alert"');
    expect(html).toContain("border-red-500");
    expect(html).toContain("This run is currently full");
  });

  it("disables only Yes and flags it in red when the run is already full", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain('role="alert"');
    expect(html).toContain("This run is currently full");
    expect(html.match(/This run is currently full/g)).toHaveLength(1);
  });

  it("shows the full notice above the Yes/No buttons even with a leftover ?r= in the URL", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const token = await tokenOf(me.id);
    for (const r of [undefined, "yes", "no", "closed"]) {
      const html = await render(token, r);
      expect(html).toContain('role="alert"');
      expect(html.indexOf("This run is currently full")).toBeLessThan(html.indexOf(">Yes<"));
    }
  });

  it("also flags a full run for someone who said No earlier, even after a rejected Yes", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" }, "declined");
    const token = await tokenOf(me.id);
    for (const r of [undefined, "full"]) {
      const html = await render(token, r);
      expect(html).toContain('role="alert"');
      expect(html.match(/disabled=""/g)).toHaveLength(1);
      expect(html).toContain("You&#x27;re out");
    }
  });

  it("drops a stale ?r=full once a spot opens up", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const token = await tokenOf(me.id);
    expect(await render(token, "full")).toContain("This run is currently full");

    await db.delete(eventAttendees).where(eq(eventAttendees.id, a.id));
    const html = await render(token, "full");
    expect(html).not.toContain("This run is currently full");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('disabled=""');
  });

  it("drops a stale ?r=closed while the run is open", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    expect(await render(await tokenOf(me.id), "closed")).not.toContain("This run is closed.");
  });

  it("keeps the buttons enabled for someone already in a full run", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    const me = await makeAttendee(e.id, { displayName: "Me" }, "confirmed");
    const html = await render(await tokenOf(me.id));
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('role="alert"');
  });

  it("shows a closed run as an error alert", async () => {
    const e = await makeEvent("2020-01-01");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("This run is closed.");
    expect(html).toContain('role="alert"');
  });

  it("tells players to text the organizer about +1s", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    expect(await render(await tokenOf(me.id))).toContain("text the organizer directly");
  });

  it("shows Yes/No while open (including the day of) and hides them once locked", async () => {
    const open = await makeEvent(todayISO());
    const a = await makeAttendee(open.id, { displayName: "A" });
    const openHtml = await render(await tokenOf(a.id));
    expect(openHtml).toContain(">Yes<");
    expect(openHtml).toContain(">No<");

    const past = await makeEvent("2020-01-01");
    const b = await makeAttendee(past.id, { displayName: "B" });
    const pastHtml = await render(await tokenOf(b.id));
    expect(pastHtml).not.toContain(">Yes<");
    expect(pastHtml).toContain("This run is closed");
  });

  it("404s on an unknown or malformed token", async () => {
    await expect(render("not-a-token")).rejects.toThrow();
    await expect(render("00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });
});

describe("RSVP link preview", () => {
  it("builds a date-only title for a known token", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Secret Name" });
    const meta = await generateMetadata({
      params: Promise.resolve({ token: await tokenOf(me.id) }),
    } as never);
    expect(meta.openGraph?.title).toContain("Ball on");
    expect(JSON.stringify(meta)).not.toContain("Secret Name");
  });

  it("returns no metadata for an unknown token", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ token: "not-a-token" }),
    } as never);
    expect(meta).toEqual({});
  });
});

describe("RSVP preview image", () => {
  it("renders a PNG for a known token and still renders for an unknown one", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    for (const token of [await tokenOf(me.id), "not-a-token"]) {
      const res = await OgImage({ params: Promise.resolve({ token }) });
      expect(res.headers.get("content-type")).toBe("image/png");
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    }
  });
});

describe("RSVP time and location", () => {
  it("puts a divider between the name and the date", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain('<hr class="border-divider"/>');
    expect(html.indexOf("<hr")).toBeGreaterThan(html.indexOf(">Me<"));
    expect(html.indexOf("<hr")).toBeLessThan(html.indexOf("Tue, Jan 1"));
  });

  it("shows the time and links the location", async () => {
    const e = await makeEvent(FUTURE);
    await db.update(events).set({
      startTime: "20:00",
      locationName: "Main Gym",
      locationAddress: "1 Gym Way, Town",
    }).where(eq(events.id, e.id));
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("Tue, Jan 1 · 8:00 PM");
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=1%20Gym%20Way%2C%20Town"');
    expect(html).toContain("1 Gym Way, Town</div>");
    expect(html).toContain(">Main Gym<");
    expect(html).toContain(">Map<");
  });

  it("omits both for runs without them", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).not.toContain(">Map<");
    expect(html).not.toContain("·");
  });
});

describe("RSVP payment section", () => {
  it("is set off by a divider", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html.lastIndexOf("<hr")).toBeGreaterThan(html.indexOf("text the organizer"));
    expect(html.lastIndexOf("<hr")).toBeLessThan(html.indexOf(">Payment Info<"));
  });

  it("links each Venmo account", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("Payment");
    expect(html).toContain("Zelle");
    expect(html).toContain("714-791-1606");
    expect(html).toContain('href="https://account.venmo.com/u/UmerMemon"');
    expect(html).toContain("@UmerMemon");
    expect(html).toContain('href="https://account.venmo.com/u/anthony10101"');
    expect(html).toContain('href="https://account.venmo.com/u/Alvintphan"');
  });

  it("groups payment methods under each person", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    // Scope to the Payment card, then split into one block per person.
    const card = html.slice(html.indexOf(">Payment Info<"));
    const block = (name: string) => {
      const start = card.indexOf(`>${name}<`);
      const end = card.indexOf("</li>", start);
      return card.slice(start, end);
    };
    const anthony = block("Anthony");
    expect(anthony).toContain("@anthony10101");
    expect(anthony).toContain("714-791-1606");
    expect(anthony).not.toContain("UmerMemon");

    const umer = block("Umer");
    expect(umer).toContain("@UmerMemon");
    expect(umer).toContain("memon.management@gmail.com");
    expect(umer).toContain("$MemonManagement");
    expect(umer).not.toContain("anthony10101");

    const alvin = block("Alvin");
    expect(alvin).toContain("@Alvintphan");
    expect(alvin).not.toContain("714-791-1606");
  });

  it("leaves out methods a person doesn't take", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    const card = html.slice(html.indexOf(">Payment Info<"));
    // Alvin only takes Venmo.
    const start = card.indexOf(">Alvin<");
    const alvin = card.slice(start, card.indexOf("</li>", start));
    expect(alvin).toContain("@Alvintphan");
    expect(alvin).not.toContain("Zelle");
    expect(alvin).not.toContain("Cash App");
    // Only Umer takes Cash App.
    expect(card.split("Cash App")).toHaveLength(2);
  });

  it("shows Umer's Zelle email and Cash App link", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("memon.management@gmail.com");
    expect(html).toContain("Cash App");
    expect(html).toContain('href="https://cash.app/$MemonManagement"');
    expect(html).toContain("$MemonManagement");
  });
});

describe("RSVP confirmed count", () => {
  it("counts confirmed people and their confirmed +1s, not Asked or declined", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const a = await makeAttendee(e.id, { displayName: "Alice" }, "confirmed");
    await makePlusOne(a.id, "confirmed");
    await makePlusOne(a.id, "invited");
    await makeAttendee(e.id, { displayName: "Declan" }, "declined");
    await makeAttendee(e.id, { displayName: "Bo" });

    const html = await render(await tokenOf(me.id));
    expect(html).toContain("2 of 15 spots");
    expect(html).toContain("13 left");
    expect(html).not.toContain("Alice");
  });

  it("shows 0 when nobody has confirmed", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" });
    expect(await render(await tokenOf(me.id))).toContain("0 of 15 spots");
  });
});

describe("RSVP status colors", () => {
  async function statusHtml(status: "confirmed" | "declined" | "invited") {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" }, status);
    return render(await tokenOf(me.id));
  }

  it("shows a Yes in green", async () => {
    const html = await statusHtml("confirmed");
    expect(html).toContain("border-green-500");
    expect(html).toContain("text-green-400");
  });

  it("shows a No as muted gray with a cross, not red", async () => {
    const html = await statusHtml("declined");
    expect(html).toContain("You&#x27;re out");
    expect(html).toContain("✕");
    expect(html).toContain("border-neutral-500");
    expect(html).not.toContain("border-red-500");
    expect(html).not.toContain("text-red-400");
  });

  it("shows a check next to a Yes", async () => {
    expect(await statusHtml("confirmed")).toContain("✓");
  });

  it("leaves no response neutral", async () => {
    const html = await statusHtml("invited");
    expect(html).not.toContain("border-green-500");
    expect(html).not.toContain("border-red-500");
  });
});

describe("RSVP spots filled", () => {
  it("shows a partly filled bar with spots left", async () => {
    const e = await makeEvent(FUTURE, { capacity: 4 });
    const me = await makeAttendee(e.id, { displayName: "Me" });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("1 of 4 spots");
    expect(html).toContain("3 left");
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain("width:25%");
    expect(html).not.toContain(">Full<");
  });

  it("labels a full run without amber, since the red alert already flags it", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain("1 of 1 spots");
    expect(html).toContain(">Full<");
    expect(html).not.toContain("amber");
    expect(html).toContain("width:100%");
  });
});

describe("RSVP header details", () => {
  it("shows a today pill on the day of the run and none once it's past", async () => {
    const today = await makeEvent(todayISO());
    const a = await makeAttendee(today.id, { displayName: "A" });
    expect(await render(await tokenOf(a.id))).toContain(">today<");

    const past = await makeEvent("2020-01-01");
    const b = await makeAttendee(past.id, { displayName: "B" });
    const html = await render(await tokenOf(b.id));
    expect(html).not.toContain(">today<");
    expect(html).not.toMatch(/>in \d+ days?</);
  });

  it("shows the location name without a Map link when there's no address", async () => {
    const e = await makeEvent(FUTURE);
    await db.update(events).set({ locationName: "Main Gym" }).where(eq(events.id, e.id));
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain(">Main Gym<");
    expect(html).not.toContain(">Map<");
  });

  it("falls back to the address as the title when there's no location name", async () => {
    const e = await makeEvent(FUTURE);
    await db.update(events).set({ locationAddress: "1 Gym Way, Town" }).where(eq(events.id, e.id));
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html).toContain(">1 Gym Way, Town<");
    expect(html).toContain(">Map<");
  });
});

describe("RSVP spots bar limits", () => {
  it("caps the bar at 100% if the run is somehow over capacity", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const b = await makeAttendee(e.id, { displayName: "B" }, "confirmed");
    const html = await render(await tokenOf(b.id));
    expect(html).toContain("2 of 1 spots");
    expect(html).toContain("width:100%");
    expect(html).toContain('aria-valuenow="1"');
  });
});
