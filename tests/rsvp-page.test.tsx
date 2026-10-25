import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees } from "@/db/schema";
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
  it("lists who's in, with their confirmed +1s, and the cap", async () => {
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

  it("counts Asked people and Asked +1s as pending", async () => {
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
    expect(await render(await tokenOf(me.id))).toContain("Current answer</span><span");
    expect(await render(await tokenOf(me.id))).toContain(">No response yet<");
    const yesHtml = await render(await tokenOf(yes.id));
    expect(yesHtml).toContain("Current answer</span><span");
    expect(yesHtml).toContain(">You&#x27;re in<");
  });

  it("doesn't repeat a yes/no result as a message; the Current answer card is enough", async () => {
    const e = await makeEvent(FUTURE);
    const me = await makeAttendee(e.id, { displayName: "Me" }, "confirmed");
    const html = await render(await tokenOf(me.id), "yes");
    expect(html).toContain(">You&#x27;re in<");
    expect(html).not.toContain("See you there");
    expect(html).not.toContain('role="alert"');
    const no = await makeAttendee(e.id, { displayName: "No" }, "declined");
    const noHtml = await render(await tokenOf(no.id), "no");
    expect(noHtml).toContain(">You&#x27;re out<");
    expect(noHtml).not.toContain("Thanks for letting us know");
  });

  it("uses singular for one pending person", async () => {
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
    expect(html).toContain("this run is full right now");
  });

  it("disables Yes/No and flags it in red when the run is already full", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const html = await render(await tokenOf(me.id));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('role="alert"');
    expect(html).toContain("this run is full right now");
    expect(html.match(/this run is full right now/g)).toHaveLength(1);
  });

  it("shows the full notice above Current answer even with a leftover ?r= in the URL", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const token = await tokenOf(me.id);
    for (const r of [undefined, "yes", "no", "closed"]) {
      const html = await render(token, r);
      expect(html).toContain('role="alert"');
      expect(html.indexOf("this run is full right now")).toBeLessThan(html.indexOf("Current answer"));
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
      expect(html.match(/disabled=""/g)).toHaveLength(2);
      expect(html).toContain(">You&#x27;re out<");
    }
  });

  it("drops a stale ?r=full once a spot opens up", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const me = await makeAttendee(e.id, { displayName: "Me" });
    const token = await tokenOf(me.id);
    expect(await render(token, "full")).toContain("this run is full right now");

    await db.delete(eventAttendees).where(eq(eventAttendees.id, a.id));
    const html = await render(token, "full");
    expect(html).not.toContain("this run is full right now");
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
