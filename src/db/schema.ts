import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Data model per the Thursday Ball PRD (see project doc `prd.md`).
 *
 * - Only the 3 organizers ever authenticate (Google OAuth, gated by the
 *   ORGANIZER_EMAILS env var allowlist) -> `users` table.
 * - Every person we might invite (organizers included) lives in `regulars`,
 *   the reusable roster. An organizer's `regulars` row links to their
 *   `users` row via `userId`; everyone else has `userId = null`.
 * - `events` are hard-deleted once everyone (including +1s) has paid.
 *   No history is kept by design.
 * - `eventAttendees` is the join between an event and either a roster
 *   `regular` or an ad-hoc name typed in for that event only.
 * - `plusOnes` are individually tracked (not just a count) so each +1's
 *   payment can be marked separately, with an optional name for reference.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const regulars = pgTable("regulars", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  phone: text("phone"),
  notes: text("notes"),
  isOrganizer: boolean("is_organizer").notNull().default(false),
  // Set only for organizers, linking their roster entry to their login.
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventStatusValues = ["open", "closed"] as const;
export type EventStatus = (typeof eventStatusValues)[number];

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  status: text("status", { enum: eventStatusValues })
    .notNull()
    .default("open"),
  // Hard cap enforced in application logic (see PRD 4.6): confirmed
  // attendees + all their plus-ones must never exceed this.
  capacity: integer("capacity").notNull().default(15),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inviteStatusValues = ["invited", "confirmed", "declined"] as const;
export type InviteStatus = (typeof inviteStatusValues)[number];

export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    // Nullable: allows a one-off name not in the roster.
    regularId: uuid("regular_id").references(() => regulars.id, {
      onDelete: "set null",
    }),
    // Required when regularId is null (ad-hoc attendee for this event only).
    displayName: text("display_name"),
    inviteStatus: text("invite_status", { enum: inviteStatusValues })
      .notNull()
      .default("invited"),
    paid: boolean("paid").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // A given regular can only appear once per event.
    eventRegularUnique: uniqueIndex("event_attendees_event_regular_unique").on(
      table.eventId,
      table.regularId,
    ),
  }),
);

export const plusOnes = pgTable("plus_ones", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventAttendeeId: uuid("event_attendee_id")
    .notNull()
    .references(() => eventAttendees.id, { onDelete: "cascade" }),
  // Optional — a +1 doesn't need to be named.
  name: text("name"),
  // Tracked independently of the inviting attendee's own invite_status —
  // a +1 can be confirmed (or still awaiting a response) even if the
  // regular who's bringing them has declined.
  inviteStatus: text("invite_status", { enum: inviteStatusValues })
    .notNull()
    .default("invited"),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Relations (for Drizzle's relational query API) ---

export const usersRelations = relations(users, ({ many }) => ({
  regular: many(regulars),
  eventsCreated: many(events),
}));

export const regularsRelations = relations(regulars, ({ one, many }) => ({
  user: one(users, {
    fields: [regulars.userId],
    references: [users.id],
  }),
  attendances: many(eventAttendees),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(
  eventAttendees,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventAttendees.eventId],
      references: [events.id],
    }),
    regular: one(regulars, {
      fields: [eventAttendees.regularId],
      references: [regulars.id],
    }),
    plusOnes: many(plusOnes),
  }),
);

export const plusOnesRelations = relations(plusOnes, ({ one }) => ({
  attendee: one(eventAttendees, {
    fields: [plusOnes.eventAttendeeId],
    references: [eventAttendees.id],
  }),
}));
