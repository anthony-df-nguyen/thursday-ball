"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

// What the server actually answered after a Yes/No, read from the `?r=`
// redirect. The click event alone can't tell "went through" from "run was
// full". `?r=` is dropped afterwards so a refresh doesn't count it twice.
export function RsvpResultTracker({ result }: { result: string | undefined }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!result || tracked.current) return;
    tracked.current = true;
    posthog.capture("rsvp_result", { result });
    const url = new URL(window.location.href);
    url.searchParams.delete("r");
    window.history.replaceState(window.history.state, "", url);
  }, [result]);

  return null;
}
