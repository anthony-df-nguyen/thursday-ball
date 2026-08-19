@AGENTS.md

# Thursday Ball — Project Context

This file carries the product spec for this repo so any Claude Code session working here has full context without hunting through chat history. Keep it in sync with the project's `prd.md` doc as decisions change.

## Current state of the repo

v1 scaffold is in place: Next.js 16 (App Router, TypeScript, Tailwind v4), Auth.js (NextAuth v5) with Google OAuth gated by `ORGANIZER_EMAILS`, Drizzle ORM schema for Neon Postgres, and working pages for login, events list, roster, and event detail (invite status, +1s, payment toggles, capacity enforcement, delete-when-paid). See `README.md` for setup steps and `src/db/schema.ts` for the data model. From here, work is refinement/iteration on top of that scaffold, not starting from scratch.

Note: this repo is on **Next.js 16**, which renamed Middleware to **Proxy** (`src/proxy.ts`, not `middleware.ts` — same functionality). Check `node_modules/next/dist/docs/` before assuming an older Next.js convention applies.

---

# Product Requirements Document

**Status:** v1 spec, all open questions resolved
**Owner:** Anthony
**Last updated:** 2026-08-19

## 1. Summary

A mobile-first web app for a friend group to organize pickup basketball ("ball") sessions. Three organizers create events, invite people from a shared roster of regulars (including themselves, since organizers play too), track RSVPs and +1s, cap total headcount at 15, and track payment for both regulars and their +1s — deleting the event once everyone's paid.

## 2. Goals

- Make it fast, on a phone, to stand up a new event and see who's in.
- Keep a reusable roster of regulars so organizers aren't re-typing names every week.
- Make payment collection visible at a glance — for regulars *and* their +1s — so nothing falls through the cracks.
- Keep the data model and UI dead simple — this is a tool for ~15-20 people, not a scheduling platform.

## 3. Users & Roles

- **Organizer** (3 people, fixed for now): full control — create/edit/delete events, manage the regulars roster, add/remove anyone from an event, toggle invite status and payment status, add/remove +1s. Organizers are also regulars themselves — `organizer` is a flag on a person, not a separate category of person. They show up in the same roster and can be added to events as attendees like anyone else.
- **Player**: any of the regulars (organizers included), or a one-off/+1 who gets added to a specific event.

**Auth:** Google OAuth (Gmail login) via NextAuth, restricted to the 3 organizers via an allowlist of Gmail addresses stored in an environment variable (e.g. `ORGANIZER_EMAILS="a@gmail.com,b@gmail.com,c@gmail.com"`), checked at sign-in — anyone else's Google login is rejected. This is fully organizer-operated for v1 — non-organizer players never log in at all; they're just roster entries the organizers manage. All invites, RSVP tracking, and payment status happen via the organizers texting/talking to people outside the app and then updating the app themselves.

## 4. Core Concepts / Data Model

### 4.1 User (login accounts — organizers only)
- id, name, email (from Google), avatar
- Only the 3 organizers have `User` accounts / ever authenticate. Non-organizer players never log in, so they don't need a `User` record at all — just a `Regular` entry (below).

### 4.2 Regular (roster of people we typically play with)
- id, name, nickname/short name, phone (optional, for reference), `is_organizer` flag, notes (optional)
- Purpose: fast re-add to events via a picker list, avoid retyping names. Includes the 3 organizers alongside everyone else — an organizer's `Regular` entry links to their `User` account (so they can log in), while everyone else's `Regular` entry has no linked account.

### 4.3 Event
- id, date, status (`open` | `closed`/paid-off), created_by (organizer), created_at
- No location field for now — it's always the same spot.
- Capacity: hard cap of **15 total headcount**, where headcount = confirmed regulars/players **plus** any +1s they're bringing. A confirmed regular with 2 +1s counts as 3 toward the cap.
- Deleted once everyone (including all +1s) has paid — true hard delete, no history kept. Once gone, it's gone; there's no past-events log by design.

### 4.4 EventAttendee (join table: Event ↔ Regular, or ad-hoc name)
- id, event_id, regular_id (nullable — allows one-off names not in the roster), display_name (used if not a regular)
- `invite_status`: `invited` (waiting on response) → `confirmed` (going) or `declined` (can't make it). Organizer manually sets this; no notifications sent in v1. `declined` keeps the record visible so organizers know not to ask again, without counting toward the 15.
- `paid`: boolean (this person's own payment)

### 4.5 PlusOne (each +1 tracked individually, tied to an attendee)
- id, event_attendee_id, `name` (optional, free text — e.g. "John's friend Mike"), `paid`: boolean
- Modeled as individual rows (not just a count) specifically so each +1's payment can be tracked separately — a regular bringing 2 +1s might have one paid and one not. A +1 doesn't need to be a `Regular` — just a slot with its own optional name and paid flag.
- Adding/removing a +1 = adding/removing a row.

### 4.6 Capacity math (resolved)
The 15-cap is **total headcount**: every `confirmed` attendee counts as 1, plus 1 for each of their +1 rows. `declined` and `invited` (not yet confirmed) don't count toward the cap. UI should show a running total (e.g. "12 / 15") and block confirming a new attendee or adding a +1 once at 15.

## 5. Key User Flows

1. **Create an event** — organizer picks a date, event is created in `open` status.
2. **Build the invite list** — organizer opens the regulars roster (organizers included), taps to add people to the event as `invited`. Can also add a one-off name not in the roster.
3. **Track responses** — organizer manually flips each attendee to `confirmed` or `declined` as people respond (via text/group chat, outside the app). `declined` attendees stay visible on the event so organizers remember they already asked and got a no.
4. **Add +1s** — for any confirmed attendee, organizer adds/removes individual +1 rows.
5. **Enforce the cap** — UI blocks confirming a new attendee (or adding a +1) once total headcount hits 15.
6. **Track payment** — organizer taps a checkbox per attendee *and* per +1 to mark paid/unpaid. Event view shows "X of Y paid" across everyone, including +1s.
7. **Close out the event** — once every attendee and every +1 shows paid, organizer deletes the event (manual action, with a confirmation — not automatic, to avoid accidental data loss).

## 6. Non-Functional Requirements

- **Mobile-first**: primary usage is on phones in a web browser (not a native app). Layouts, tap targets, and flows should be designed mobile-first; desktop is a nice-to-have, not the target.
- **Fast interactions**: adding/removing people and +1s, and toggling invite/payment status, should feel instant (optimistic UI updates).
- **Small, closed group**: no public sign-up flow needed; access can be limited to known Google accounts if desired (allowlist by email domain or explicit list).

## 7. Tech Stack

- **Frontend/Framework:** Next.js (App Router) + Tailwind CSS
- **Auth:** NextAuth.js (Auth.js v5) with Google provider
- **Database:** Neon (serverless Postgres)
- **ORM:** Drizzle
- **Hosting:** Vercel

## 8. Out of Scope (v1)

- Real notifications/SMS/email invites (organizer handles invites via existing group chat; app is just the tracker)
- Payment processing/integration (Venmo, etc.) — just paid/unpaid flags
- Self-service RSVP by non-organizer players — fully organizer-operated for v1, confirmed
- Recurring event templates / auto-scheduling
- Location/venue tracking (always the same spot for now)
- Stats/history (e.g. attendance streaks) — event is hard-deleted once paid off, no historical record is kept, confirmed

## 9. Open Questions

None outstanding — all resolved during PRD review. Log new decisions here as they come up during implementation.

## 10. Suggested Build Order (v1)

1. Auth (Google OAuth via NextAuth, gated by `ORGANIZER_EMAILS` allowlist env var) + seed the 3 organizer `User`/`Regular` records
2. Regulars roster CRUD (organizers included)
3. Event CRUD (create/list/delete)
4. Event detail: add/remove attendees from roster or ad-hoc, invite/confirm/decline toggle, +1 add/remove (with optional name), 15-headcount-cap enforcement
5. Payment checkboxes for attendees and +1s + "X of Y paid" summary
6. Delete-event flow with confirmation once fully paid
