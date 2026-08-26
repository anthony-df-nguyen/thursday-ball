"use client";

import { useState } from "react";
import { nextThursdayISO } from "@/lib/dates";

export function NewRunForm({
  createEvent,
}: {
  createEvent: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary min-h-11 text-sm"
        onClick={() => setOpen(true)}
      >
        + New Run
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 flex items-end justify-center bg-[color-mix(in_srgb,var(--color-neutral-900)_60%,transparent)]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[430px] bg-surface rounded-t-lg shadow-lg px-4 pt-4 pb-7"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">New run</h3>
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
              <button type="submit" className="btn btn-primary btn-block min-h-12">
                Create Run
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
