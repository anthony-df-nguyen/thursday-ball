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
    <input
      defaultValue={name ?? ""}
      onBlur={(e) => {
        const value = e.target.value;
        startTransition(() => {
          setPlusOneName(eventId, plusOneId, value);
        });
      }}
      placeholder="name (optional)"
      className="flex-1 min-w-0 border-none bg-none font-[inherit] text-base text-text py-1.5 px-1"
    />
  );
}
