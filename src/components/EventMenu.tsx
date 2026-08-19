"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export function EventMenu({
  eventId,
  allPaid,
  unpaidCount,
  deleteEvent,
}: {
  eventId: string;
  allPaid: boolean;
  unpaidCount: number;
  deleteEvent: (eventId: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"closeout" | "cancel" | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuOpen]);

  const confirmTitle = confirmAction === "cancel" ? "Cancel this run?" : "Close out this run?";
  const confirmBody =
    confirmAction === "cancel"
      ? `This cancels and permanently deletes the run — no history is kept.${
          allPaid ? "" : ` ${unpaidCount} ${unpaidCount === 1 ? "person" : "people"} still show unpaid.`
        }`
      : (allPaid
          ? "Everyone's paid. "
          : `${unpaidCount} ${unpaidCount === 1 ? "person" : "people"} still show unpaid. `) +
        "This permanently deletes the run — no history is kept.";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Run options"
        onClick={() => setMenuOpen((v) => !v)}
        className="w-9 h-9 rounded-md bg-surface border border-divider cursor-pointer text-lg text-text flex items-center justify-center"
      >
        ⋯
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-10 z-20 min-w-[170px] rounded-md border border-divider bg-surface shadow-lg overflow-hidden">
          <button
            type="button"
            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-text"
            disabled={!allPaid}
            onClick={() => {
              setMenuOpen(false);
              setConfirmAction("closeout");
            }}
          >
            {allPaid ? "Close out — everyone paid" : `Close out (${unpaidCount} unpaid)`}
          </button>
          <button
            type="button"
            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer text-accent-300 border-t border-divider"
            onClick={() => {
              setMenuOpen(false);
              setConfirmAction("cancel");
            }}
          >
            Cancel this Run
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="dialog-backdrop z-30" onClick={() => setConfirmAction(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">{confirmTitle}</div>
            <p className="dialog-body m-0">{confirmBody}</p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary min-h-11"
                onClick={() => setConfirmAction(null)}
              >
                Keep
              </button>
              <button
                type="button"
                className="btn btn-primary min-h-11"
                disabled={pending}
                onClick={() => startTransition(() => deleteEvent(eventId))}
              >
                {confirmAction === "cancel" ? "Cancel run" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
