"use client";

import { useState, useTransition } from "react";

type Regular = { id: string; name: string; isOrganizer: boolean };

export function AddPlayersSheet({
  eventId,
  availableRegulars,
  addRegularToEvent,
  addAdHocAttendee,
}: {
  eventId: string;
  availableRegulars: Regular[];
  addRegularToEvent: (eventId: string, regularId: string) => Promise<void>;
  addAdHocAttendee: (eventId: string, formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [oneOff, setOneOff] = useState("");
  const [, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn btn-filled btn-block text-[15px] mt-4"
        onClick={() => setOpen(true)}
      >
        Add Players
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 flex items-end justify-center bg-[color-mix(in_srgb,var(--color-neutral-900)_60%,transparent)]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] max-h-[75dvh] overflow-auto bg-surface rounded-t-lg shadow-lg px-4 pt-4 pb-7"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Add players</h3>
              <button type="button" className="btn btn-ghost min-h-11" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 mb-2">
              Tap a regular to add them as invited.
            </p>
            <div className="border-t border-divider mt-2.5 mb-2.5 pt-3.5 flex gap-2">
              <input
                className="input min-h-[36px]"
                placeholder="Add a non-regular person"
                value={oneOff}
                maxLength={40}
                onChange={(e) => setOneOff(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary min-h-[36px] flex-none"
                onClick={() => {
                  const name = oneOff.trim();
                  if (!name) return;
                  const formData = new FormData();
                  formData.set("displayName", name);
                  startTransition(() => addAdHocAttendee(eventId, formData));
                  setOneOff("");
                }}
              >
                Add
              </button>
            </div>
            {availableRegulars.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => startTransition(() => addRegularToEvent(eventId, r.id))}
                className="w-full flex items-center gap-2.5 min-h-[52px] bg-none border-none border-t border-divider font-[inherit] text-[15px] font-semibold text-text cursor-pointer text-left px-0.5"
              >
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                {r.isOrganizer && <span className="tag tag-outline">ORG</span>}
                <span className="text-accent font-semibold text-lg">+</span>
              </button>
            ))}
            {availableRegulars.length === 0 && (
              <p className="text-[13px] text-neutral-500 border-t border-divider pt-3 m-0">
                Everyone on the roster is already on this run.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
