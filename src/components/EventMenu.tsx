"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import posthog from "posthog-js";
import type { UpdateEventResult } from "@/app/(app)/actions";
import { EditRunSheet, type EditableRun } from "./EditRunSheet";

export function EventMenu({
  eventId,
  archived,
  allPaid,
  unpaidCount,
  run,
  headcount,
  updateEvent,
  deleteEvent,
  archiveEvent,
  unarchiveEvent,
}: {
  eventId: string;
  archived: boolean;
  allPaid: boolean;
  unpaidCount: number;
  run: EditableRun;
  headcount: number;
  updateEvent: (eventId: string, formData: FormData) => Promise<UpdateEventResult>;
  deleteEvent: (eventId: string) => Promise<void>;
  archiveEvent: (eventId: string) => Promise<void>;
  unarchiveEvent: (eventId: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "cancel" | null>(null);
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

  const unpaidNote = allPaid
    ? ""
    : `${unpaidCount} ${unpaidCount === 1 ? "person" : "people"} still show unpaid. `;

  const confirmTitle = confirmAction === "cancel" ? "Delete this run?" : "Archive this run?";
  const confirmBody =
    confirmAction === "cancel"
      ? `${unpaidNote}This permanently deletes the run and removes it from stats. It can't be undone.`
      : `${unpaidNote}The run moves off the main list. It still counts toward stats.`;

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
            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer text-text"
            onClick={() => {
              setMenuOpen(false);
              posthog.capture("run_edit_opened", { event_id: eventId, archived });
              setEditOpen(true);
            }}
          >
            Edit run
          </button>
          {archived ? (
            <button
              type="button"
              className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer text-text"
              onClick={() => {
                setMenuOpen(false);
                posthog.capture("run_unarchived", { event_id: eventId });
                startTransition(() => unarchiveEvent(eventId));
              }}
            >
              Unarchive to edit
            </button>
          ) : (
            <button
              type="button"
              className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer text-text"
              onClick={() => {
                setMenuOpen(false);
                setConfirmAction("archive");
              }}
            >
              {allPaid ? "Archive — everyone paid" : `Archive (${unpaidCount} unpaid)`}
            </button>
          )}
          <button
            type="button"
            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold bg-none border-none cursor-pointer text-accent-300 border-t border-divider"
            onClick={() => {
              setMenuOpen(false);
              setConfirmAction("cancel");
            }}
          >
            Delete this Run
          </button>
        </div>
      )}

      <EditRunSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        eventId={eventId}
        run={run}
        headcount={headcount}
        updateEvent={updateEvent}
      />

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
                onClick={() => {
                  posthog.capture(confirmAction === "cancel" ? "run_deleted" : "run_archived", {
                    event_id: eventId,
                    all_paid: allPaid,
                    unpaid_count: unpaidCount,
                  });
                  startTransition(() =>
                    confirmAction === "cancel" ? deleteEvent(eventId) : archiveEvent(eventId),
                  );
                }}
              >
                {confirmAction === "cancel" ? "Delete" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
