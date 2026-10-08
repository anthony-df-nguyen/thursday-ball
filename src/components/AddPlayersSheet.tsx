"use client";

import { useState, useTransition } from "react";
import { InfoTooltip } from "./InfoTooltip";
import { Sheet } from "./Sheet";

type Regular = { id: string; name: string; isOrganizer: boolean };

type AddPlayersProps = {
  eventId: string;
  availableRegulars: Regular[];
  addRegularToEvent: (eventId: string, regularId: string) => Promise<void>;
  addAdHocAttendee: (eventId: string, formData: FormData) => Promise<void>;
};

// The picker itself — rendered inside a bottom sheet on mobile and docked
// beside the attendee list on desktop.
export function AddPlayersPanel({
  eventId,
  availableRegulars,
  addRegularToEvent,
  addAdHocAttendee,
  action,
}: AddPlayersProps & { action?: React.ReactNode }) {
  const [oneOff, setOneOff] = useState("");
  const [, startTransition] = useTransition();

  return (
    <>
      <div className="flex justify-between items-center flex-none">
        <div className="flex gap-1 items-center">
          <h3 className="text-lg font-medium">Add Players</h3>
          <InfoTooltip text="Add a regular to the run. If someone isn't a regular, type their name and tap Add. If they're going to be playing with us somewhat regularly, we recommend adding them to the roster instead." />
        </div>
        {action}
      </div>
      <p className="text-xs text-neutral-500 mt-0.5 mb-2 flex-none">
        Tap a regular to add them as invited.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = oneOff.trim();
          if (!name) return;
          const formData = new FormData();
          formData.set("displayName", name);
          startTransition(() => addAdHocAttendee(eventId, formData));
          setOneOff("");
        }}
        className="border-t border-divider mt-2.5 mb-2.5 pt-3.5 flex gap-2 flex-none"
      >
        <input
          className="input min-h-[36px]"
          placeholder="Add a non-regular person"
          value={oneOff}
          maxLength={40}
          onChange={(e) => setOneOff(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary min-h-[36px] flex-none">
          Add
        </button>
      </form>
      <div className="flex-1 min-h-0 overflow-auto">
        {availableRegulars.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => startTransition(() => addRegularToEvent(eventId, r.id))}
            className={`w-full flex items-center gap-2.5 bg-none border-t border-divider font-[inherit] text-sm font-semibold text-text cursor-pointer text-left px-0.5 py-1.5 hover:bg-bg/40 ${
              i === availableRegulars.length - 1 ? "border-b" : ""
            }`}
          >
            <span className="text-accent font-semibold text-lg">+</span>
            <span className="flex-1 min-w-0 truncate">{r.name}</span>
            {r.isOrganizer && <span className="tag tag-outline">ORG</span>}
          </button>
        ))}
        {availableRegulars.length === 0 && (
          <p className="text-[13px] text-neutral-500 border-t border-divider pt-3 m-0">
            Everyone on the roster is already on this run.
          </p>
        )}
      </div>
    </>
  );
}

export function AddPlayersSheet(props: AddPlayersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-filled btn-block text-[15px] mt-4 md:hidden"
        onClick={() => setOpen(true)}
      >
        Add Players
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        className="max-h-[75dvh] flex flex-col"
      >
        <AddPlayersPanel
          {...props}
          action={
            <button type="button" className="btn btn-ghost min-h-11" onClick={() => setOpen(false)}>
              Done
            </button>
          }
        />
      </Sheet>
    </>
  );
}
