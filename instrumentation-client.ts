import posthog from "posthog-js";
import { scrubEventProperties } from "@/lib/analytics";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogProjectToken) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    );
  }
} else if (!posthogHost) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    );
  }
} else {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: "2026-05-30",
    capture_exceptions: true,
    // RSVP links carry a secret token; keep it out of captured URLs.
    before_send: (event) => {
      if (!event) return event;
      event.properties = scrubEventProperties(event.properties) ?? event.properties;
      return event;
    },
    debug: process.env.NODE_ENV === "development",
  });
}
