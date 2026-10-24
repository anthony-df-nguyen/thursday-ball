import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { regulars, users } from "@/db/schema";
import {
  createRegular,
  loadMorePersonRuns,
  setDefaultInviteMessage,
  updateRegular,
} from "@/app/(app)/actions";
import { makeRegular, resetDb, seedOrganizer } from "./helpers";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("roster", () => {
  it("creates a regular, trimming and nulling blank optionals", async () => {
    await createRegular(form({ name: "  Ann  ", nickname: " ", phone: " 555 " }));
    const [r] = await db.select().from(regulars);
    expect(r).toMatchObject({ name: "Ann", nickname: null, phone: "555", isOrganizer: false });
  });

  it("ignores a blank name", async () => {
    await createRegular(form({ name: "   " }));
    expect(await db.select().from(regulars)).toHaveLength(0);
  });

  it("caps names at 40 characters", async () => {
    await createRegular(form({ name: "x".repeat(60) }));
    const [r] = await db.select().from(regulars);
    expect(r.name).toHaveLength(40);
  });

  it("updates a regular and clears fields left blank", async () => {
    const r = await makeRegular("Ann");
    await db.update(regulars).set({ phone: "555", nickname: "A" }).where(eq(regulars.id, r.id));
    await updateRegular(r.id, form({ name: "Anna", nickname: "", phone: "" }));
    const [after] = await db.select().from(regulars);
    expect(after).toMatchObject({ name: "Anna", nickname: null, phone: null });
  });

  it("keeps the old name when an update has a blank name", async () => {
    const r = await makeRegular("Ann");
    await updateRegular(r.id, form({ name: " " }));
    expect((await db.select().from(regulars))[0].name).toBe("Ann");
  });
});

describe("default invite message", () => {
  it("saves a trimmed message for the signed-in organizer only", async () => {
    const other = (
      await db.insert(users).values({ email: "other@example.com" }).returning()
    )[0];
    await setDefaultInviteMessage(form({ message: "  Ball tonight?  " }));
    const rows = await db.select().from(users);
    expect(rows.find((u) => u.id === process.env.TEST_USER_ID)?.defaultInviteMessage).toBe(
      "Ball tonight?",
    );
    expect(rows.find((u) => u.id === other.id)?.defaultInviteMessage).toBeNull();
  });

  it("a blank message resets to the app default (null)", async () => {
    await setDefaultInviteMessage(form({ message: "Hi" }));
    await setDefaultInviteMessage(form({ message: "   " }));
    const [u] = await db.select().from(users).where(eq(users.id, process.env.TEST_USER_ID!));
    expect(u.defaultInviteMessage).toBeNull();
  });
});

describe("stats paging action", () => {
  it("requires sign-in", async () => {
    const { auth } = await import("@/auth");
    (auth as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    await expect(loadMorePersonRuns("x", 0)).rejects.toThrow("Not signed in");
  });
});
