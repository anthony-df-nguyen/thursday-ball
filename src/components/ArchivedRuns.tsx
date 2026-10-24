"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MdCheck } from "react-icons/md";
import { formatRunDate } from "@/lib/dates";
import type { getArchivedRuns as GetArchivedRuns } from "@/app/(app)/actions";

type Page = Awaited<ReturnType<typeof GetArchivedRuns>>;
type Run = Page["runs"][number];

const PAGE_SIZE = 10;

function monthLabel(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// Shows only the count until expanded, then loads archived runs a page at a
// time as compact rows grouped by month.
export function ArchivedRuns({
  count,
  getArchivedRuns,
}: {
  count: number;
  getArchivedRuns: (cursor: Page["nextCursor"]) => Promise<Page>;
}) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [cursor, setCursor] = useState<Page["nextCursor"]>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function load(from: Page["nextCursor"]) {
    setFailed(false);
    startTransition(async () => {
      try {
        const page = await getArchivedRuns(from);
        setRuns((prev) => [...(prev ?? []), ...page.runs]);
        setCursor(page.nextCursor);
      } catch {
        setFailed(true);
      }
    });
  }

  const remaining = count - (runs?.length ?? 0);

  const groups: { month: string; runs: Run[] }[] = [];
  for (const run of runs ?? []) {
    const month = monthLabel(run.date);
    const last = groups.at(-1);
    if (last?.month === month) last.runs.push(run);
    else groups.push({ month, runs: [run] });
  }

  return (
    <details
      className="mt-6"
      onToggle={(e) => {
        if (e.currentTarget.open && !runs && !pending) load(null);
      }}
    >
      <summary className="cursor-pointer text-[13px] font-semibold text-neutral-400">
        Archived ({count})
      </summary>
      <div className="mt-3 grid gap-4">
        {groups.map((group) => (
          <section key={group.month}>
            <h3 className="m-0 mb-1.5 text-[11px] tracking-[0.08em] uppercase text-neutral-500 font-semibold">
              {group.month}
            </h3>
            <div className="rounded-lg bg-surface shadow-sm overflow-hidden">
              {group.runs.map((run) => {
                const { date, weekday } = formatRunDate(run.date);
                return (
                  <Link
                    key={run.id}
                    href={`/events/${run.id}`}
                    className="flex items-center gap-2 px-3.5 min-h-11 border-b border-divider last:border-b-0 no-underline text-text"
                  >
                    <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">
                      {date}
                      <span className="font-normal text-neutral-500"> · {weekday.slice(0, 3)}</span>
                    </span>
                    <span className="text-[13px] text-neutral-400 tabular-nums">
                      {run.headcount} in
                    </span>
                    <span className="w-16 flex justify-end text-[13px]">
                      {run.headcount === 0 ? (
                        <span className="text-neutral-400" aria-label="No one confirmed">
                          —
                        </span>
                      ) : run.unpaid === 0 ? (
                        <MdCheck
                          size={20}
                          role="img"
                          aria-label="All paid"
                          className="text-neutral-400"
                        />
                      ) : (
                        <span className="text-red-500 font-semibold">{run.unpaid} unpaid</span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {pending && (
          <p className="text-[13px] text-neutral-500 m-0">Loading…</p>
        )}
        {failed && (
          <p className="text-[13px] text-neutral-500 m-0">
            Couldn&apos;t load archived runs.{" "}
            <button
              type="button"
              onClick={() => load(cursor)}
              className="bg-transparent border-0 p-0 cursor-pointer font-semibold text-accent"
            >
              Retry
            </button>
          </p>
        )}
        {cursor && !pending && !failed && (
          <button
            type="button"
            onClick={() => load(cursor)}
            className="btn btn-secondary min-h-11"
          >
            Show {Math.min(PAGE_SIZE, remaining)} more ({remaining} left)
          </button>
        )}
      </div>
    </details>
  );
}
