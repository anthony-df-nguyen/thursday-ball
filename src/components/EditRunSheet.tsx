"use client";

import { useState, useTransition } from "react";
import posthog from "posthog-js";
import { MAX_CAPACITY } from "@/lib/runDetails";
import type { UpdateEventResult } from "@/app/(app)/actions";
import { Sheet } from "./Sheet";

export type EditableRun = {
  capacity: number;
  locationName: string | null;
  locationAddress: string | null;
};

const ERRORS: Record<Extract<UpdateEventResult, { ok: false }>["error"], string> = {
  invalid: `Capacity must be a whole number from 1 to ${MAX_CAPACITY}.`,
  not_found: "This run no longer exists.",
  capacity_below_headcount:
    "More people are in than that. Remove or un-confirm some first, or pick a higher number.",
};

export function EditRunSheet({
  open,
  onClose,
  eventId,
  run,
  headcount,
  updateEvent,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  run: EditableRun;
  headcount: number;
  updateEvent: (eventId: string, formData: FormData) => Promise<UpdateEventResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const fieldsChanged = [
      String(formData.get("capacity")).trim() !== String(run.capacity) && "capacity",
      String(formData.get("locationName")).trim() !== (run.locationName ?? "") &&
        "location_name",
      String(formData.get("locationAddress")).trim() !== (run.locationAddress ?? "") &&
        "location_address",
    ].filter(Boolean);
    if (fieldsChanged.length === 0) {
      onClose();
      return;
    }
    posthog.capture("run_edit_submitted", {
      event_id: eventId,
      fields_changed: fieldsChanged,
    });
    startTransition(async () => {
      const result = await updateEvent(eventId, formData);
      if (result.ok) {
        setError(null);
        onClose();
      } else {
        posthog.capture("run_edit_blocked", { event_id: eventId, reason: result.error });
        setError(ERRORS[result.error]);
      }
    });
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Edit Run</h3>
        <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
          Cancel
        </button>
      </div>
      <form action={submit} className="mt-2.5 flex flex-col gap-2.5">
        <label
          htmlFor="edit-capacity"
          className="text-[11px] tracking-[0.08em] uppercase text-neutral-400"
        >
          Capacity
        </label>
        <input
          id="edit-capacity"
          className="input min-h-[46px] w-full"
          type="number"
          name="capacity"
          inputMode="numeric"
          required
          min={Math.max(1, headcount)}
          max={MAX_CAPACITY}
          defaultValue={run.capacity}
        />
        <p className="text-xs text-neutral-500 m-0">
          {headcount} in so far, so it can&apos;t go below that.
        </p>
        <label
          htmlFor="edit-location-name"
          className="text-[11px] tracking-[0.08em] uppercase text-neutral-400"
        >
          Location
        </label>
        <input
          id="edit-location-name"
          className="input min-h-[46px] w-full"
          type="text"
          name="locationName"
          placeholder="Court name"
          defaultValue={run.locationName ?? ""}
        />
        <input
          aria-label="Address"
          className="input min-h-[46px] w-full"
          type="text"
          name="locationAddress"
          placeholder="Address (123 Main St, City)"
          autoComplete="street-address"
          defaultValue={run.locationAddress ?? ""}
        />
        {error && (
          <p role="alert" className="text-xs text-accent-300 m-0">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-filled btn-block min-h-12">
          Save
        </button>
      </form>
    </Sheet>
  );
}
