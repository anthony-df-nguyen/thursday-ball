"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { nextThursdayISO } from "@/lib/dates";
import { MAX_CAPACITY } from "@/lib/runDetails";
import { Sheet } from "./Sheet";

export function NewRunForm({
  createEvent,
  defaults,
}: {
  createEvent: (formData: FormData) => Promise<void>;
  defaults: { capacity: number; startTime: string; locationName: string; locationAddress: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-filled min-h-11 text-sm"
        onClick={() => setOpen(true)}
      >
        + New Run
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Add a New Run</h3>
          <button type="button" className="btn btn-ghost min-h-11" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
        <form
          action={createEvent}
          onSubmit={() => posthog.capture("run_creation_submitted")}
          className="mt-2.5 flex flex-col gap-2.5"
        >
          <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400">Date</label>
          <input
            className="input min-h-[46px] w-full min-w-0 max-w-full box-border"
            type="date"
            name="date"
            required
            defaultValue={nextThursdayISO()}
          />
          <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400">Time</label>
          <input
            className="input min-h-[46px] w-full min-w-0 max-w-full box-border"
            type="time"
            name="startTime"
            defaultValue={defaults.startTime}
          />
          <label
            htmlFor="new-run-capacity"
            className="text-[11px] tracking-[0.08em] uppercase text-neutral-400"
          >
            Capacity
          </label>
          <input
            id="new-run-capacity"
            className="input min-h-[46px] w-full"
            type="number"
            name="capacity"
            inputMode="numeric"
            required
            min={1}
            max={MAX_CAPACITY}
            defaultValue={defaults.capacity}
          />
          <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400">Location</label>
          <input
            className="input min-h-[46px] w-full"
            type="text"
            name="locationName"
            placeholder="Court name"
            defaultValue={defaults.locationName}
          />
          <input
            className="input min-h-[46px] w-full"
            type="text"
            name="locationAddress"
            placeholder="Address (123 Main St, City)"
            autoComplete="street-address"
            defaultValue={defaults.locationAddress}
          />
          <button type="submit" className="btn btn-filled btn-block min-h-12">
            Create Run
          </button>
        </form>
      </Sheet>
    </>
  );
}
