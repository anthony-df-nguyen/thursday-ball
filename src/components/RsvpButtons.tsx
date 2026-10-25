"use client";

import { useRef, useState } from "react";

// Yes/No for the public RSVP page. Backing out after saying yes is the one
// answer organizers need to hear about directly, so it asks first.
export function RsvpButtons({
  confirmed,
  disabled = false,
  yesAction,
  noAction,
}: {
  confirmed: boolean;
  // Run is full and they haven't answered yet: nothing to submit.
  disabled?: boolean;
  yesAction: () => Promise<void>;
  noAction: () => Promise<void>;
}) {
  const [warning, setWarning] = useState(false);
  const noForm = useRef<HTMLFormElement>(null);

  return (
    <>
      <div className="mt-5 flex gap-3">
        <form action={yesAction} className="flex-1">
          <button
            type="submit"
            disabled={disabled}
            className="w-full h-12 rounded-lg bg-accent font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Yes
          </button>
        </form>
        <form ref={noForm} action={noAction} className="flex-1">
          <button
            type={confirmed ? "button" : "submit"}
            onClick={confirmed ? () => setWarning(true) : undefined}
            disabled={disabled}
            className="w-full h-12 rounded-lg bg-surface shadow-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            No
          </button>
        </form>
      </div>

      {warning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="rsvp-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-surface shadow-sm p-5">
            <div id="rsvp-warning-title" className="font-heading font-medium text-[15px]">
              You said you were in
            </div>
            <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">
              Changing to No frees up your spot. Please also let the organizers
              know directly so we can plan around it if you can&apos;t attend last minute.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setWarning(false)}
                className="flex-1 h-11 rounded-lg bg-accent font-semibold text-white"
              >
                Keep me in
              </button>
              <button
                type="button"
                onClick={() => noForm.current?.requestSubmit()}
                className="flex-1 h-11 rounded-lg bg-surface shadow-sm font-semibold"
              >
                I can&apos;t make it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
