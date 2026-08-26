"use client";

import { useTransition } from "react";

export function PlusOneNameInput({
  eventId,
  plusOneId,
  name,
  setPlusOneName,
}: {
  eventId: string;
  plusOneId: string;
  name: string | null;
  setPlusOneName: (eventId: string, plusOneId: string, name: string) => Promise<void>;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <input
        defaultValue={name ?? ""}
        onBlur={(e) => {
          const value = e.target.value;
          startTransition(() => {
            setPlusOneName(eventId, plusOneId, value);
          });
        }}
        placeholder="name (optional)"
        // font-size stays at 16px (text-base) so iOS Safari doesn't
        // zoom the page on focus; scale() shrinks it visually to match
        // the xs attendee-name rows instead. The 133.33% width + left
        // origin compensates so the scaled box still fills the flex slot.
        className="block w-[133.33%] origin-left scale-75 border-none bg-none font-[inherit] text-base text-text py-1.5 px-1"
      />
    </div>
  );
}
