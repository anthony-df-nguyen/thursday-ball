# PostHog analytics

Every PostHog event the app sends, with the insight each one gives you. Client-side events are `posthog.capture` calls in the browser. Server-side events are logs sent to PostHog Logs from server actions (`src/lib/posthogLogs.ts`).

Keep this file in sync when you add, rename or remove an event.

## Client side

### Automatic (`instrumentation-client.ts`)

| Event | What you learn |
|---|---|
| Pageviews and autocaptured clicks | Which pages get visited, including `/stats` and the RSVP page. Raw taps, with no meaning attached. |
| Exceptions (`capture_exceptions`) | Frontend crashes and errors, including those caught by `global-error.tsx`. |

### RSVP page (players)

| Event | What you learn |
|---|---|
| `rsvp_response_submitted` (`response`: yes/no) | Intent: who tapped Yes or No. It fires on click, before the server decides. |
| `rsvp_result` (`result`: yes/no/full/closed/not_found) | What actually happened. Compare with the click event to see how many tries fail, and whether people hit full or closed runs. |
| `payment_link_clicked` (`method`: venmo/cash_app) | Whether players use the payment links, and which app they prefer. Zelle is plain text, so it isn't tracked. |

All RSVP page events carry `event_id` and `attendee_id`. Visitors who never answer show up as a pageview with no response.

### Organizer actions

All carry `event_id` unless noted.

| Event | What you learn |
|---|---|
| `run_creation_submitted` | How often runs are created and how often the form is submitted. No `event_id`. |
| `player_added` (`player_type`: regular/one_off) | How much the roster is used versus typing in one-off names. |
| `attendee_removed` | How often people get dropped from a run, a sign of churn. |
| `plus_one_added` / `plus_one_removed` | How common +1s are and how often they get cancelled. |
| `attendance_payment_updated` / `plus_one_payment_updated` (`paid`) | How actively organizers chase and record payments. Ticks and unticks are both recorded. |
| `invite_text_opened` (`has_rsvp_link`) | How many invites go out by text, and whether organizers include the RSVP link. |
| `capacity_blocked` (`source`: status_chip) | How often a run hits the cap while organizers are confirming people. |
| `run_archived` / `run_deleted` (`all_paid`, `unpaid_count`) | How runs end, and whether they're closed out fully paid. |
| `run_edit_opened` (`archived`) | How often organizers start editing a run. Compare with `run_edit_submitted` to see abandonment. |
| `run_edit_submitted` (`fields_changed`: any of capacity/location_name/location_address) | What organizers actually fix. Fires on save when something changed, not on a no-op save. Field names only, never the values. |
| `run_edit_blocked` (`reason`: capacity_below_headcount/invalid/not_found) | How often the server refuses an edit, especially a capacity set below the people already in. |
| `run_unarchived` | How often archived runs need to be reopened to fix the record. |
| `regular_updated` / `regular_removed` | How much the roster is maintained. No `event_id`. |

### Stats page

| Event | What you learn |
|---|---|
| `stats_person_selected` (`source`: dropdown/ranked_list/back, `player_type`, `player_id`) | Whether anyone looks at individual players, and how they navigate. |
| `stats_metric_changed` (`metric`, `player_type`, `player_id`) | Whether people care about played or no-show numbers. |
| `stats_runs_loaded_more` (`loaded_so_far`, `player_type`, `player_id`) | Whether anyone goes deep into a player's history. |

For Stats events, `player_type` is `regular`, `former` or `everyone`. A former player (no longer on the roster) is sent with no id and no name.

### Identity

These are not events. They're set on every client event.

- Organizers are identified by their roster id (`regulars.id`), with `is_organizer: true` and a `user_id` property holding their login id. If an organizer has no roster entry, the login id is used. Set in `AppHeader`.
- RSVP visitors are identified by their roster id, falling back to the attendee id for one-off names. Set in `RsvpIdentify`.
- Events are grouped by run (`run` group), and `event_id` and `attendee_id` are registered as properties on the RSVP page.
- Ids only, never names. Names change and the RSVP token is a credential.
- RSVP tokens are scrubbed from every captured URL (`/rsvp/<token>` becomes `/rsvp/[token]`) in `before_send`. See `src/lib/analytics.ts`.

## Server side

| Log | What you learn |
|---|---|
| `event created` (`operation: create_event`) | Confirms a run was actually created. Compare with `run_creation_submitted` to find failed creations. |
| `event updated` (`operation: update_event`, `fields_changed`: comma-separated field names) | The reliable record that a run edit saved. Compare with `run_edit_submitted` to find failed edits. Skipped when nothing changed. |
| `attendee invite status updated` (`operation: set_invite_status`, `status`) | Organizer status changes that went through the server (confirmed, declined, etc.). |
| `rsvp submitted` (`operation: submit_rsvp`, `answer`, `distinct_id`, `event_id`, `attendee_id`) | The reliable record of each RSVP that was saved. Gives per-person response history and response rates. |
| `rsvp blocked` (`operation: rsvp_blocked`, `reason`: full/closed, `event_id`, `attendee_id`) | RSVPs that were refused. It shows demand you couldn't serve (full) or late responses (closed). |

## Known gaps

- Only a few actions are logged server-side. Archive, delete, payments, +1s and roster changes have only the client event, so a failed server action would still show a click.
- Client events fire on click, not on success. The exception is `rsvp_result`, which reports the server's answer.
- `capacity_blocked` only covers the status chip turning a tap into OUT on a full run. A server-side race, where the cap fills between the tap and the write, isn't tracked.
- Run edits only cover capacity and location. Date and time can't be edited yet.
- Events recorded before the roster-id identity change stay under the organizer's old login id.
