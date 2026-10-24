# Tests

Run these before pushing to `main`.

## Quick start

```bash
docker compose up -d   # local Postgres, if it isn't already running
npm test               # run everything once
```

All tests should pass in about 5 seconds. `npm run test:watch` re-runs affected tests as you edit.

To run part of the suite:

```bash
npx vitest run tests/stats.test.ts            # one file
npx vitest run -t "at capacity"               # tests whose name matches
npx vitest run tests/components               # one folder
```

## What you need

- **Docker Postgres running.** The server-side tests hit a real database. If it isn't reachable, the run stops immediately with "Run `docker compose up -d` first."
- **Nothing else.** No `.env.local` values, Google login, or Neon access are needed.

## How the database is handled

- Tests use their own database, `thursday_ball_test`, on the same local Postgres as dev. It is created automatically on the first run, and the schema is synced from `src/db/schema.ts` at the start of every run. So after you change the schema, just run `npm test`. You don't need to run `db:push` for the test database.
- Every test starts from empty tables, so tests can't affect each other or your dev data.
- Your dev database (`thursday_ball`) and Neon are never touched. The test setup refuses to run against any database whose name doesn't end in `_test`, or against a `neon.tech` host.
- To use a different test database, set `TEST_DATABASE_URL` (the database name must still end in `_test`).

## What's covered

| File | Covers |
| --- | --- |
| `capacity.test.ts` | The 15-person cap: confirmed attendees and +1s count, invited and declined don't, confirming is blocked when full |
| `events.test.ts` | Create, archive, unarchive and delete (with cascade), adding attendees, deleting a regular, archived-run paging, signed-out rejection |
| `flow.test.ts` | The core flow end to end (invite, confirm, +1, pay, no-show, archive summary, stats), plus paid toggles, +1 names, and removals |
| `roster.test.ts` | Creating and editing regulars, the per-organizer invite message, auth on the stats paging action |
| `stats.test.ts` | Played and no-show counts, archived and future runs, runs per month, ad-hoc names, history paging |
| `dates.test.ts` | Next Thursday, date formatting, "today" in the California timezone |
| `components/*.test.tsx` | `StatusChip` (cycle and menu), `AttendeeList`, `RunCard`, `EventMenu` (archive/delete confirmations), `NewRunForm`, `PlusOneNameInput`, the add-player and edit-regular sheets, `StatsView`, `ArchivedRuns`, and the small buttons and bars |

Not covered: pages, the Google login flow and route protection (`src/auth.ts` allowlist, `src/proxy.ts`), and `AppHeader`.

## Writing tests

- **Server actions and queries:** put them in `tests/*.test.ts`. Use the helpers in `helpers.ts` (`resetDb`, `seedOrganizer`, `makeEvent`, `makeAttendee`, …). Call `resetDb()` and `seedOrganizer()` in a `beforeEach`.
- **Components:** put them in `tests/components/*.test.tsx`, starting with `// @vitest-environment jsdom`. Query by role or label, like a user would.
- `setup.ts` mocks the Next.js bits that need a request (`revalidatePath`, `redirect`) and the login session, so actions run as the seeded organizer.

## Troubleshooting

- **"Can't reach Postgres for tests":** start it with `docker compose up -d`.
- **Port 5432 already in use or wrong password:** the test URL defaults to `postgres:postgres@localhost:5432`, matching `docker-compose.yml`. Override it with `TEST_DATABASE_URL` if yours differs.
- **Odd failures after pulling schema changes:** run `npm test` again. The schema re-syncs on every run.
