"use client";

import { useState, useTransition } from "react";
import { Sheet } from "./Sheet";

type Regular = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
};

export function EditRegularSheet({
  regular,
  isOrganizer,
  updateRegular,
  deleteRegular,
}: {
  regular: Regular;
  isOrganizer: boolean;
  updateRegular: (regularId: string, formData: FormData) => Promise<void>;
  deleteRegular: (regularId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex  items-center gap-2.5 bg-none border-b border-gray-600 font-[inherit] text-text cursor-pointer text-left py-3 hover:bg-surface/40"
      >
        <span className="flex-1 font-semibold text-[15px] min-w-0 flex items-baseline gap-1.5">
          <span className="truncate">{regular.name}</span>
          {regular.nickname && (
            <span className="flex-none font-normal text-[13px] text-neutral-500">
              &ldquo;{regular.nickname}&rdquo;
            </span>
          )}
        </span>
        {regular.phone && (
          <svg
            aria-label="Phone number on file"
            className="size-3 text-neutral-500 flex-none"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.56 1 1 0 0 1-.25 1.01l-2.2 2.22Z" />
          </svg>
        )}
        {isOrganizer && <span className="tag tag-outline">ORG</span>}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} className="max-h-[75dvh] overflow-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Edit player</h3>
          <button type="button" className="btn btn-ghost min-h-11" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>

        <form
          action={(formData) => {
            startTransition(async () => {
              await updateRegular(regular.id, formData);
              setOpen(false);
            });
          }}
          className="flex flex-col gap-2.5 mt-3"
        >
          <input
            className="input min-h-12"
            type="text"
            name="name"
            placeholder="Name"
            defaultValue={regular.name}
            maxLength={40}
            required
          />
          <input
            className="input min-h-12"
            type="text"
            name="nickname"
            placeholder="Nickname (optional)"
            defaultValue={regular.nickname ?? ""}
          />
          <input
            className="input min-h-12"
            type="tel"
            name="phone"
            placeholder="Phone (optional)"
            defaultValue={regular.phone ?? ""}
          />
          <button
            type="submit"
            className="btn btn-primary btn-block min-h-12 mt-1"
            disabled={pending}
          >
            Save
          </button>
        </form>

        {!isOrganizer && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await deleteRegular(regular.id);
                setOpen(false);
              });
            }}
            className="w-full min-h-12 mt-3.5 bg-none border-none border-t border-divider pt-3.5 text-[15px] font-semibold cursor-pointer text-[var(--color-danger,#d0342c)]"
          >
            Remove from roster
          </button>
        )}
      </Sheet>
    </>
  );
}
