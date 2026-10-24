import { beforeEach, describe, expect, it } from "vitest";
import { getPersonRuns, getStats, RUNS_PAGE_SIZE } from "@/db/stats";
import { makeAttendee, makeEvent, makeRegular, resetDb, seedOrganizer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

const find = (data: Awaited<ReturnType<typeof getStats>>, name: string) =>
  data.people.find((p) => p.name === name)!;

describe("getStats", () => {
  it("counts confirmed as played and no_show as a miss; ignores the rest", async () => {
    const r = await makeRegular("Sam");
    for (const [date, status] of [
      ["2026-01-08", "confirmed"],
      ["2026-01-15", "no_show"],
      ["2026-01-22", "declined"],
      ["2026-01-29", "invited"],
    ] as const) {
      const e = await makeEvent(date);
      await makeAttendee(e.id, { regularId: r.id }, status);
    }
    const sam = find(await getStats(), "Sam");
    expect(sam).toMatchObject({ played: 1, noShows: 1, runCount: 2, lastPlayed: "2026-01-08" });
    expect(sam.byMonth["2026-01"]).toEqual({ played: 1, noShows: 1 });
  });

  it("includes archived runs", async () => {
    const r = await makeRegular("Sam");
    const e = await makeEvent("2026-01-08", { status: "closed" });
    await makeAttendee(e.id, { regularId: r.id }, "confirmed");
    expect(find(await getStats(), "Sam").played).toBe(1);
  });

  it("excludes future runs", async () => {
    const r = await makeRegular("Sam");
    const e = await makeEvent("2999-01-01");
    await makeAttendee(e.id, { regularId: r.id }, "confirmed");
    const data = await getStats();
    expect(find(data, "Sam").played).toBe(0);
    expect(data.runsByMonth["2999-01"]).toBeUndefined();
  });

  it("counts past runs per month, even empty ones", async () => {
    await makeEvent("2026-01-08");
    await makeEvent("2026-01-15");
    await makeEvent("2026-02-05");
    expect((await getStats()).runsByMonth).toEqual({ "2026-01": 2, "2026-02": 1 });
  });

  it("lists roster members with no history", async () => {
    await makeRegular("Newbie");
    expect(find(await getStats(), "Newbie")).toMatchObject({ played: 0, runCount: 0 });
  });

  it("groups ad-hoc attendees by name", async () => {
    const e1 = await makeEvent("2026-01-08");
    const e2 = await makeEvent("2026-01-15");
    await makeAttendee(e1.id, { displayName: "Walk-on" }, "confirmed");
    await makeAttendee(e2.id, { displayName: "Walk-on" }, "confirmed");
    const p = find(await getStats(), "Walk-on");
    expect(p.key).toBe("name:Walk-on");
    expect(p.played).toBe(2);
  });

  it("caps runs at one page, newest first, and getPersonRuns pages the rest", async () => {
    const r = await makeRegular("Grinder");
    const total = RUNS_PAGE_SIZE + 5;
    for (let i = 0; i < total; i++) {
      const d = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
      const e = await makeEvent(d);
      await makeAttendee(e.id, { regularId: r.id }, "confirmed");
    }
    const p = find(await getStats(), "Grinder");
    expect(p.runCount).toBe(total);
    expect(p.runs).toHaveLength(RUNS_PAGE_SIZE);
    expect(p.runs[0].date > p.runs[1].date).toBe(true);

    const rest = await getPersonRuns(p.key, RUNS_PAGE_SIZE);
    expect(rest).toHaveLength(5);
    expect(rest[0].date < p.runs.at(-1)!.date).toBe(true);
  });

  it("getPersonRuns works for name-keyed people", async () => {
    const e = await makeEvent("2026-01-08");
    await makeAttendee(e.id, { displayName: "Walk-on" }, "no_show");
    const runs = await getPersonRuns("name:Walk-on", 0);
    expect(runs).toEqual([{ eventId: e.id, date: "2026-01-08", result: "no_show", paid: false }]);
  });
});
