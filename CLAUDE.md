@AGENTS.md

# Thursday Ball — Project Context

This file carries the product spec for this repo so any Claude Code session working here has full context without hunting through chat history. Keep it in sync with the project's `prd.md` doc as decisions change.

## Current state of the repo

v1 is built and in use, and the PRD below describes what exists today (not the original plan). Work now is refinement on top of it.

- **Organizer app** (behind Google login, mobile-first with a desktop layout): Runs list (open runs, plus archived runs paged in on demand), run detail, Roster, Stats, Settings (each organizer's default invite text), Profile, and a Help page with the how-to steps.
- **Public RSVP page** (`/rsvp/[token]`, no login): each attendee gets a private link to answer yes/no, see the run details, and find payment options.
- **Analytics:** PostHog on the client and server; see the Analytics section below.
- **Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4), Auth.js (NextAuth v5) with Google OAuth gated by `ORGANIZER_EMAILS`, Drizzle ORM on Neon Postgres. See `README.md` for setup and `src/db/schema.ts` for the data model.

Note: this repo is on **Next.js 16**, which renamed Middleware to **Proxy** (`src/proxy.ts`, not `middleware.ts` — same functionality). Check `node_modules/next/dist/docs/` before assuming an older Next.js convention applies.

## Testing

Vitest suite in `tests/` (details in `tests/README.md`). It needs `docker compose up -d`; it uses its own `thursday_ball_test` database, never `.env.local`.

- **Every feature or behavior change ships with tests in the same change.** New server action or query → a test in `tests/*.test.ts` (use the helpers in `tests/helpers.ts`). New or changed component logic → `tests/components/*.test.tsx`. Bug fix → a test that fails without the fix.
- If a change alters existing behavior, update the affected tests rather than deleting or loosening them; mention it if an existing test had to change.
- Run `npm test` (plus `npx tsc --noEmit` and `npm run lint`) before calling work done, and report failures honestly.
- If you add or rename test files, or the suite's coverage meaningfully changes, update the coverage table in `tests/README.md`.

## Analytics (PostHog)

`docs/analytics.md` lists every PostHog event (client `posthog.capture` calls and server-side `logPostHogServerAction` logs), what each one tells us, and the identity setup.

- **Every new PostHog event must be documented in `docs/analytics.md` in the same change**: add a row with the event name, its properties, and the insight it gives us. The same goes for renaming or removing an event, or changing its properties. The doc must always match what the code actually sends. Update its "Known gaps" section too if coverage changes.
- Identify people by stable ids only, never names, and never put an RSVP token in an event.

---

# Product Requirements Document

**Status:** v1 shipped; this reflects what the app does today
**Owner:** Anthony
**Last updated:** 2026-10-25

Keep this section in sync with the code as behavior changes.

## 1. Summary

A mobile-first web app for a friend group to organize pickup basketball ("ball") runs. Three organizers create runs, invite people from a shared roster of regulars (including themselves, since organizers play too), track RSVPs and +1s, cap total headcount (14 by default on the New Run form), and track payment for both regulars and their +1s. Invited players answer yes/no through a private link; they never log in. When a run is over, the organizers archive it (it still counts in stats) or delete it if it never happened.

## 2. Goals

- Make it fast, on a phone, to stand up a new run and see who's in.
- Keep a reusable roster of regulars so organizers aren't re-typing names every week.
- Let players answer for themselves with one tap, without accounts.
- Make payment collection visible at a glance — for regulars *and* their +1s — so nothing falls through the cracks.
- Show simple attendance stats (runs played, no-shows) from real history.
- Keep the data model and UI simple — this is a tool for ~15-20 people, not a scheduling platform.

## 3. Users & Roles

- **Organizer** (3 people, fixed): full control — create/edit/archive/delete runs, manage the regulars roster, add/remove anyone from a run, set invite status and payment status, add/remove +1s, view stats. Organizers are also regulars themselves — `isOrganizer` is a flag on a roster entry, not a separate kind of person.
- **Player**: any regular (organizers included), or a one-off/+1 added to a specific run. Players never log in. A player with an RSVP link can answer yes/no for themselves on the public RSVP page and nothing else.

**Auth:** Google OAuth (Gmail login) via Auth.js, restricted to the organizers by the `ORGANIZER_EMAILS` env var allowlist, checked at sign-in. Everything except `/login`, the auth routes and `/rsvp/*` requires a signed-in organizer (`src/proxy.ts`). On first sign-in an organizer's `users` row and linked `regulars` row are created.

## 4. Data Model

See `src/db/schema.ts` for the source of truth.

### 4.1 User (organizers only)
- id, email, name, image, `defaultInviteMessage` (optional; falls back to the app default in `src/lib/inviteMessage.ts`).

### 4.2 Regular (the roster)
- id, name, nickname, phone (optional; enables the text-invite button), notes, `isOrganizer`, `userId` (set only for organizers, linking to their login).
- Deleting a regular copies their name onto their past attendee rows first, so their history stays visible and counted in stats.

### 4.3 Event (a "run")
- id, `date`, optional `startTime` ("HH:MM"), optional `locationName` and `locationAddress`, `status` (`open` | `closed`), `capacity` (set on the New Run form, which defaults to 14; the column default is 15), `archivedAt`, `createdBy`.
- Ends one of two ways: **archived** (`closed`, hidden from the main list but still editable, can be unarchived) or **deleted** (hard delete, cascades everything, removes it from stats).
- Stats are computed live from every run dated today or earlier, archived or not.

### 4.4 EventAttendee (Event ↔ Regular, or an ad-hoc name)
- id, event, `regularId` (null for a one-off name), `displayName` (for one-offs), `inviteStatus`, `paid`, `rsvpToken`.
- A given regular can appear only once per run.
- `inviteStatus`: `invited` (shown as ASKED) → `confirmed` (IN) or `declined` (OUT). After the run, `no_show` (said yes but didn't play) is also available. Organizers set it by hand; players can set yes/no themselves via the RSVP page.
- `rsvpToken`: an unguessable uuid. The link is the credential for the public RSVP page, and it only ever touches that one attendee's yes/no.

### 4.5 PlusOne (tracked individually, tied to an attendee)
- id, attendee, optional `name`, `inviteStatus`, `paid`.
- A +1 has its **own** invite status, independent of the person bringing them. New +1s start as `invited` and don't count toward capacity until confirmed.

### 4.6 Capacity
- Headcount = confirmed attendees + confirmed +1s. `invited`, `declined` and `no_show` don't count.
- The cap is enforced in a single conditional SQL statement (`src/db/capacity.ts`), so there's no window between checking and writing. Organizers can't confirm past the cap, and the status chip skips Confirm when the run is full. A player's "Yes" on the RSVP page is refused when full.

## 5. Key User Flows

1. **Create a run** — organizer picks a date, and optionally a start time, location and capacity. The form is prefilled with the usual time, place and a capacity of 14 (`runDefaults()` in `src/lib/runDetails.ts`, overridable via `DEFAULT_RUN_TIME`, `DEFAULT_RUN_CAPACITY`, `DEFAULT_LOCATION_NAME`, `DEFAULT_LOCATION_ADDRESS`). It starts `open`.
2. **Build the invite list** — add regulars from the roster (as `invited`) or type a one-off name. Organizers are on the roster like everyone else.
3. **Invite** — the message icon opens the organizer's phone text app (`sms:`) pre-filled with their default invite text plus the person's RSVP link. The app sends nothing itself.
4. **Track responses** — players answer on the RSVP page, or organizers set the status by hand (tap to cycle before the run; a menu of every status after it). Declined people stay visible so nobody gets asked twice.
5. **Add +1s** — organizers add and remove individual +1 rows, optionally named, each with its own status and paid flag.
6. **Enforce the cap** — see 4.6.
7. **Track payment** — a checkbox per confirmed attendee and per confirmed +1, with an "X of Y paid" summary.
   - **Edit a run** — the ⋯ menu's "Edit run" changes capacity and location name/address (also on archived runs). Capacity must be 1–99 and can't go below the current headcount (checked inside the UPDATE, so a simultaneous confirm can't slip past); an unchanged capacity is always allowed. Saving with no changes does nothing.
8. **After the run** — mark people who bailed as `no_show`; leave advance declines as Declined. Then archive the run (with a confirmation that notes anyone still unpaid). Delete instead only if the run never happened.
9. **Stats** — pick Everyone or a player: runs held per month, average players per run, per-player runs played, no-shows, no-show rate, last played, and paged run history with paid status.

### 5.1 Public RSVP page (`/rsvp/[token]`)
- Shows the player's name, the run's date/time/location (with a Map link), how many spots are filled, and their current answer.
- Yes/No buttons. Changing a Yes to a No asks for confirmation first.
- Answers are accepted only while the run is open and its date is today or later (`src/lib/rsvp.ts`). After that the page shows a "closed" notice and only organizers can change statuses, since Stats counts those runs. Someone marked `no_show` can't change their answer.
- Payment options (Venmo, Zelle, Cash App) per payee, configured in `src/lib/payment.ts`.
- The link preview (Open Graph) shows the date only, never names.
- Players cannot add +1s here; they're told to text an organizer.
- An unknown or malformed token is a 404.

## 6. Non-Functional Requirements

- **Mobile-first**: used mostly on phones in a browser. A desktop layout exists, but phones are the target.
- **Fast interactions**: adding/removing people and +1s and toggling status/payment feel instant (server actions with transitions and a frozen row order so lists don't jump).
- **Small, closed group**: no public sign-up; organizers are allowlisted by email, and players only ever hold their own private link.
- **Privacy in analytics**: PostHog gets stable ids only, never names, and never an RSVP token (see the Analytics section).

## 7. Tech Stack

- **Frontend/Framework:** Next.js 16 (App Router) + Tailwind CSS v4
- **Auth:** Auth.js v5 with the Google provider
- **Database:** Neon (serverless Postgres); local dev uses Docker Postgres
- **ORM:** Drizzle
- **Analytics:** PostHog (client `posthog-js`, plus server-side logs)
- **Hosting:** Vercel
- **Env vars:** `DATABASE_URL`, `ORGANIZER_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, and optionally `APP_URL` (the base URL used in RSVP links; otherwise taken from the request host) and the `DEFAULT_RUN_*`/`DEFAULT_LOCATION_*` overrides above.

## 8. Out of Scope

- The app sending SMS/email itself (organizers send the pre-filled text from their own phone)
- Payment processing/integration — just paid/unpaid flags and links to pay
- Player accounts or logins — players only have their private RSVP link
- Players adding their own +1s
- Recurring run templates / auto-scheduling
- Editing a run's date or time after creating it (not built yet; capacity and location are editable)
- Streaks, attendance-rate-vs-invited, and other advanced stats — stats are runs played per month, no-shows and no-show rate, derived live from past runs

## 9. Open Questions

None outstanding. Log new decisions here as they come up.
