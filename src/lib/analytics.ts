// Stable PostHog identity. Ids only, never names (names change) and never the
// RSVP token (it's a credential).

const RSVP_TOKEN_IN_PATH = /\/rsvp\/[0-9a-f]{8}-[0-9a-f-]{27}/gi;

// One id per human: the roster id when there is one, else the attendee row
// (ad-hoc one-off names, or a regular deleted since).
export function personDistinctId(ids: {
  regularId: string | null | undefined;
  attendeeId: string;
}): string {
  return ids.regularId ?? ids.attendeeId;
}

// "/rsvp/<token>" -> "/rsvp/[token]" anywhere inside a string.
export function scrubRsvpTokens(value: string): string {
  return value.replace(RSVP_TOKEN_IN_PATH, "/rsvp/[token]");
}

// Applied to every captured event so $current_url, $pathname, $referrer etc.
// never carry a token.
export function scrubEventProperties<T extends Record<string, unknown>>(
  props: T | undefined,
): T | undefined {
  if (!props) return props;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    out[key] = typeof value === "string" ? scrubRsvpTokens(value) : value;
  }
  return out as T;
}
