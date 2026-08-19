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
        className="btn btn-ghost min-h-11 text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        + New run
      </button>
      {open && (
        <div className="mt-3.5 rounded-md bg-surface shadow-sm p-3.5 flex flex-col gap-2.5">
          <label className="text-[11px] tracking-[0.08em] uppercase text-neutral-400">Date</label>
          <form action={createEvent}>
            <input
              className="input min-h-[46px]"
              type="date"
              name="date"
              required
              defaultValue={nextThursdayISO()}
            />
            <button type="submit" className="btn btn-primary btn-block min-h-12">
              Create run
            </button>
          </form>
        </div>
      )}
    </>
  );
}
