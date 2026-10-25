"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Ties the public RSVP page's traffic to the invited person. Renders nothing.
export function RsvpIdentify({
  distinctId,
  eventId,
  attendeeId,
  isOrganizer,
}: {
  distinctId: string;
  eventId: string;
  attendeeId: string;
  isOrganizer: boolean;
}) {
  useEffect(() => {
    if (!posthog.__loaded) return;
    if (posthog.get_distinct_id() !== distinctId) {
      posthog.identify(distinctId, { is_organizer: isOrganizer });
    }
    posthog.group("run", eventId);
    posthog.register({ event_id: eventId, attendee_id: attendeeId });
  }, [distinctId, eventId, attendeeId, isOrganizer]);

  return null;
}
