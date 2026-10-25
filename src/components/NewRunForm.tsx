"use client";

import { useState } from "react";
import { nextThursdayISO } from "@/lib/dates";
import { Sheet } from "./Sheet";

export function NewRunForm({
  createEvent,
  defaults,
}: {
  createEvent: (formData: FormData) => Promise<void>;
  defaults: { startTime: string; locationName: string; locationAddress: string };
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
