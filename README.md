# Thursday Ball

Mobile-first web app for tracking who's playing pickup basketball each week. See `prd.md` in the project for the full spec — this scaffold implements the v1 build order: organizer auth, regulars roster, events, attendees with invite status, +1s, and payment tracking.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Auth.js (NextAuth v5)** with Google OAuth, gated by an `ORGANIZER_EMAILS` allowlist
- **Drizzle ORM** + **Neon** serverless Postgres
- Deploys to **Vercel**


> Note: this project is on Next.js 16, which renamed Middleware to **Proxy** (`src/proxy.ts`, same functionality/API as middleware). If anything looks unfamiliar versus older Next.js docs, check `node_modules/next/dist/docs` or the [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16).

## Getting started

1. **Database** — pick one:
   - **Local (recommended for dev):** `docker compose up -d` starts a local Postgres 16 container (see `docker-compose.yml`). No further setup needed — the default `DATABASE_URL` in `.env.example` already points at it.
   - **Neon (production, or if you'd rather not run Docker):** create a database at [neon.tech](https://neon.tech) and copy the pooled connection string.

   `src/db/index.ts` picks the driver automatically: a `neon.tech` URL uses Neon's HTTP driver, anything else (like local Postgres) uses `node-postgres`.
2. **Create a Google OAuth client** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (add your Vercel domain's equivalent once deployed)
3. Copy the env file and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` — already set for local Docker Postgres; swap in your Neon string for production
   - `ORGANIZER_EMAILS` — comma-separated Gmail addresses for the 3 organizers
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from the Google OAuth client
   - `AUTH_SECRET` — generate with `npx auth secret`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Push the schema to your database:
   ```bash
   npm run db:push
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```
7. Visit `http://localhost:3000` — you'll be redirected to `/login`. Sign in with one of the `ORGANIZER_EMAILS` addresses.

## Project structure

```
src/
  auth.ts                 # NextAuth config: Google provider + organizer allowlist
  proxy.ts                # Route protection (Next 16's renamed middleware)
  db/
    schema.ts             # Drizzle schema: users, regulars, events, eventAttendees, plusOnes
    index.ts              # Drizzle client (Neon HTTP driver)
  app/
    login/                # Sign-in page (outside the authed route group)
    (app)/                # Everything behind login
      layout.tsx           # Shared shell + bottom nav
      page.tsx              # Events list + create event
      actions.ts            # Server actions (roster + event CRUD, invite/paid toggles, +1s)
      roster/page.tsx        # Regulars roster CRUD
      events/[eventId]/page.tsx  # Event detail: attendees, invite status, +1s, payment
```

## Data model

See `src/db/schema.ts` for the full Drizzle schema and inline comments. Summary:

- **users** — organizer login accounts only (gated by `ORGANIZER_EMAILS`)
- **regulars** — the reusable roster (includes organizers, flagged `isOrganizer`)
- **events** — one per play session, `date` only (no location — always the same spot), hard-deleted once fully paid
- **eventAttendees** — join between an event and a regular (or an ad-hoc name), with `inviteStatus` (`invited` / `confirmed` / `declined`) and `paid`
- **plusOnes** — individually tracked per attendee so each +1's payment can be marked separately, with an optional name

## Deploying

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.local` in the Vercel project settings (use your production Google OAuth redirect URI: `https://<your-domain>/api/auth/callback/google`).
4. Run `npm run db:push` once (locally, pointed at the same `DATABASE_URL`) to make sure the production database has the schema.

## Not yet built (see PRD open items / out of scope)

- No real notifications — invites happen over text/group chat; the app is just the tracker
- No payment processing — paid/unpaid is a manual flag
- No self-service login for non-organizer players (fully organizer-operated by design)
- No history after an event is deleted (intentional — hard delete once everyone's paid)
