"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { InviteStatus } from "@/db/schema";

const CHIP: Record<InviteStatus, { label: string; className: string }> = {
  confirmed: { label: "IN", className: "bg-accent-800 text-accent-100 border-transparent" },
  invited: { label: "ASKED", className: "bg-transparent text-accent border-accent" },
  declined: { label: "OUT", className: "bg-neutral-800 text-neutral-400 border-transparent" },
  no_show: { label: "NO SHOW", className: "bg-transparent text-accent-300 border-accent-300" },
};

const NEXT: Record<InviteStatus, InviteStatus> = {
  invited: "confirmed",
  confirmed: "declined",
  declined: "invited",
  no_show: "declined",
};

// Once the run has happened the job is correcting the record, so the chip
// opens a menu of every status instead of cycling through them.
const MENU_ORDER: InviteStatus[] = ["confirmed", "no_show", "declined", "invited"];

export function StatusChip({
  eventId,
  attendeeId,
  status,
  atCapacity,
  runHappened,
  setInviteStatus,
}: {
  eventId: string;
  attendeeId: string;
  status: InviteStatus;
  atCapacity: boolean;
  runHappened: boolean;
  setInviteStatus: (
    eventId: string,
    attendeeId: string,
    status: InviteStatus,
  ) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chip = CHIP[status];

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function choose(next: InviteStatus) {
    setMenuOpen(false);
    if (next === status) return;
    startTransition(() => {
      setInviteStatus(eventId, attendeeId, next);
    });
  }

  return (
    <div className="relative flex-none" ref={wrapRef}>
      <button
        type="button"
        aria-label={runHappened ? "Change status" : "Cycle status"}
        aria-haspopup={runHappened ? "menu" : undefined}
        aria-expanded={runHappened ? menuOpen : undefined}
        disabled={pending}
        onClick={() => {
          if (runHappened) {
            setMenuOpen((v) => !v);
            return;
          }
          let next = NEXT[status];
          if (next === "confirmed" && atCapacity) next = "declined";
          choose(next);
        }}
        className={`flex min-w-10 h-5 items-center justify-center rounded-sm border px-1.5 font-heading text-[9px] font-bold tracking-[0.04em] ${
          pending ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
        } ${chip.className}`}
      >
        {chip.label}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute left-0 top-6 z-20 min-w-[120px] rounded-md border border-divider bg-surface shadow-lg overflow-hidden"
        >
          {MENU_ORDER.map((option) => {
            const blocked = option === "confirmed" && atCapacity && status !== "confirmed";
            return (
              <button
                key={option}
                type="button"
                role="menuitem"
                disabled={blocked}
                onClick={() => choose(option)}
                className={`w-full text-left px-3 h-10 text-[13px] font-semibold bg-none border-none flex items-center justify-between gap-3 ${
                  blocked ? "text-neutral-600 cursor-default" : "text-text cursor-pointer"
                }`}
              >
                {CHIP[option].label}
                {option === status && <span aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
