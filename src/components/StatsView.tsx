"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { MdCheck, MdClose } from "react-icons/md";
import type { PersonStats, RunEntry } from "@/db/stats";
import { formatRunDate } from "@/lib/dates";

type Month = { key: string; short: string; long: string };
type Metric = "played" | "noShows";

const EVERYONE = "everyone";

// Ids only: roster ids pass through, but a former player's key is
// "name:<name>", which must not reach analytics.
function playerProps(key: string) {
  return key === EVERYONE
    ? { player_type: "everyone" }
    : key.startsWith("name:")
      ? { player_type: "former" }
      : { player_type: "regular", player_id: key };
}

const METRICS: { id: Metric; tab: string; title: string; noun: string }[] = [
  { id: "played", tab: "Runs played", title: "Runs played per month", noun: "played" },
  { id: "noShows", tab: "No-shows", title: "No-shows per month", noun: "no-shows" },
];

function formatLastPlayed(iso: string) {
  return new Date(iso + "T12:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function percent(noShows: number, played: number) {
  const total = noShows + played;
  return total ? `${Math.round((noShows / total) * 100)}%` : "—";
}

// Whole-number ticks: at most 4 steps, topping out at or above the max.
function yScale(max: number) {
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = Math.max(step, step * Math.ceil(max / step));
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { top, ticks };
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface shadow-sm px-3.5 py-3">
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className="font-heading font-semibold text-sm mt-0.5 leading-tight truncate">
        {value}
      </div>
    </div>
  );
}

function BarChart({
  months,
  values,
  selected,
  onSelect,
  noun,
  caption,
}: {
  months: Month[];
  values: number[];
  selected: number;
  onSelect: (i: number) => void;
  noun: string;
  caption: string;
}) {
  const { top, ticks } = yScale(Math.max(0, ...values));

  return (
    <div>
      <div className="flex">
        <div className="relative w-6 flex-none h-44" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] text-neutral-500 tabular-nums"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1 h-44">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-divider"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          <div className="absolute inset-0 flex gap-0.5">
            {months.map((m, i) => {
              const v = values[i];
              const isSelected = i === selected;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${m.long}: ${v} ${noun}`}
                  aria-pressed={isSelected}
                  className="flex-1 min-w-0 h-full flex items-end justify-center bg-transparent border-0 p-0 cursor-pointer"
                >
                  {v > 0 && (
                    <div
                      className={`relative w-full max-w-6 rounded-t-[4px] bg-accent transition-opacity ${
                        isSelected ? "opacity-100" : "opacity-55"
                      }`}
                      style={{ height: `${(v / top) * 100}%` }}
                    >
                      {isSelected && (
                        <span className="absolute -top-4 inset-x-0 text-center text-[11px] font-semibold text-text">
                          {v}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex pl-6 gap-0.5 mt-1.5" aria-hidden="true">
        {months.map((m, i) => (
          <span
            key={m.key}
            className={`flex-1 min-w-0 text-center text-[11px] ${
              i === selected ? "text-text font-semibold" : "text-neutral-500"
            }`}
          >
            {m.short}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">{noun}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.key}>
              <th scope="row">{m.long}</th>
              <td>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsView({
  people,
  runsByMonth,
  months,
  loadMoreRuns,
}: {
  people: PersonStats[];
  runsByMonth: Record<string, number>;
  months: Month[];
  loadMoreRuns: (key: string, offset: number) => Promise<RunEntry[]>;
}) {
  const [who, setWho] = useState<string>(EVERYONE);
  const [metric, setMetric] = useState<Metric>("played");
  const [selected, setSelected] = useState(months.length - 1);
  // Extra history pages fetched per player, appended after person.runs.
  const [moreRuns, setMoreRuns] = useState<Record<string, RunEntry[]>>({});
  const [loadingMore, startLoadingMore] = useTransition();

  const selectPlayer = (key: string, source: "dropdown" | "back" | "ranked_list") => {
    posthog.capture("stats_person_selected", { ...playerProps(key), source });
    setWho(key);
  };
  const selectMetric = (id: Metric) => {
    posthog.capture("stats_metric_changed", { metric: id, ...playerProps(who) });
    setMetric(id);
  };

  const person = people.find((p) => p.key === who);
  const subjects = person ? [person] : people;
  // Everyone: one chart of runs held per month. A single player: their own
  // runs played / no-shows, switchable with the tabs.
  const metricInfo = person
    ? METRICS.find((m) => m.id === metric)!
    : { title: "Runs held per month", noun: "runs" };

  const values = months.map((m) =>
    person
      ? (person.byMonth[m.key]?.[metric] ?? 0)
      : (runsByMonth[m.key] ?? 0),
  );
  const played = subjects.reduce((sum, p) => sum + p.played, 0);
  const noShows = subjects.reduce((sum, p) => sum + p.noShows, 0);
  const runsHeld = Object.values(runsByMonth).reduce((sum, n) => sum + n, 0);
  const lastPlayed = person?.lastPlayed;

  const selectedMonth = months[selected];
  const heading = person ? person.name : "Everyone";
  const hasData = values.some((v) => v > 0);

  const runs = person ? [...person.runs, ...(moreRuns[person.key] ?? [])] : [];
  const loadMore = () => {
    if (!person) return;
    posthog.capture("stats_runs_loaded_more", {
      ...playerProps(person.key),
      loaded_so_far: runs.length,
    });
    startLoadingMore(async () => {
      const next = await loadMoreRuns(person.key, runs.length);
      setMoreRuns((prev) => ({
        ...prev,
        [person.key]: [...(prev[person.key] ?? []), ...next],
      }));
    });
  };

  const ranked = people
    .filter((p) => p.played + p.noShows > 0)
    .sort((a, b) => b.played - a.played || a.name.localeCompare(b.name));

  return (
    // minmax(0,1fr) keeps the column from growing to fit a long name (the
    // select and the By player rows) and overflowing the screen.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
      <label className="block min-w-0">
        <span className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
          Player
          {person && (
            <button
              type="button"
              onClick={() => selectPlayer(EVERYONE, "back")}
              className="bg-transparent border-0 p-0 cursor-pointer text-[13px] font-semibold text-accent"
            >
              ← Back to Everyone
            </button>
          )}
        </span>
        <select
          value={who}
          onChange={(e) => selectPlayer(e.target.value, "dropdown")}
          className="input min-h-11 min-w-0 max-w-full"
        >
          <option value={EVERYONE}>Everyone (Overview)</option>
          {people.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <div
        className={`grid gap-2.5 ${person ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}
      >
        {person ? (
          <>
            <Tile label="Runs played" value={played} />
            <Tile label="Last played" value={lastPlayed ? formatLastPlayed(lastPlayed) : "—"} />
            <Tile label="No-shows" value={noShows} />
            <Tile label="No-show rate" value={percent(noShows, played)} />
            
          </>
        ) : (
          <>
            <Tile label="Runs held" value={runsHeld} />
            <Tile
              label="Avg. players per run"
              value={runsHeld ? (played / runsHeld).toFixed(1) : "—"}
            />
          </>
        )}
      </div>

      <section className="rounded-lg bg-surface shadow-sm p-4">
        {person && (
          <div role="tablist" aria-label="Chart" className="flex rounded-md border border-divider p-0.5 mb-4">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={metric === m.id}
                onClick={() => selectMetric(m.id)}
                className={`flex-1 min-h-10 rounded-[6px] border-0 cursor-pointer font-heading font-semibold text-[13px] ${
                  metric === m.id ? "bg-accent-800 text-accent-100" : "bg-transparent text-neutral-400"
                }`}
              >
                {m.tab}
              </button>
            ))}
          </div>
        )}

        <h3 className="font-heading font-medium text-base m-0">{metricInfo.title}</h3>
        <p className="text-[13px] text-neutral-400 mt-0.5 mb-5" aria-live="polite">
          {heading} · {selectedMonth.long}:{" "}
          <span className="text-text font-semibold">
            {values[selected]} {metricInfo.noun}
          </span>
        </p>

        <BarChart
          months={months}
          values={values}
          selected={selected}
          onSelect={setSelected}
          noun={metricInfo.noun}
          caption={`${metricInfo.title}, ${heading}`}
        />

        {!hasData && (
          <p className="text-[13px] text-neutral-500 mt-3 mb-0">
            Nothing recorded for {heading === "Everyone" ? "anyone" : heading} in the last{" "}
            {months.length} months.
          </p>
        )}
      </section>

      {person && (
        <section>
          <h3 className="font-heading font-medium text-base mt-1 mb-2">Run history</h3>
          {runs.length === 0 ? (
            <p className="text-[13px] text-neutral-500 m-0">No runs recorded yet.</p>
          ) : (
            <div className="rounded-lg bg-surface shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 text-[10px] tracking-[0.08em] uppercase text-neutral-500 border-b border-divider">
                <span className="flex-1">Run</span>
                <span className="w-16">Result</span>
                <span className="w-14 text-right">Paid</span>
              </div>
              {runs.map((run) => {
                const { date, weekday } = formatRunDate(run.date);
                return (
                  <Link
                    key={run.eventId}
                    href={`/events/${run.eventId}`}
                    className="flex items-center gap-2 px-3.5 min-h-11 border-b border-divider last:border-b-0 no-underline text-text"
                  >
                    <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">
                      {date}
                      <span className="font-normal text-neutral-500"> · {weekday.slice(0, 3)}</span>
                    </span>
                    <span
                      className={`w-16 text-[13px] ${
                        run.result === "no_show" ? "text-red-500 font-semibold" : "text-text"
                      }`}
                    >
                      {run.result === "played" ? "Played" : "No-show"}
                    </span>
                    <span className="w-14 flex justify-end text-[13px] text-neutral-400">
                      {run.result === "no_show" ? (
                        <span aria-label="Not applicable">—</span>
                      ) : run.paid ? (
                        <MdCheck size={20} aria-label="Paid" role="img" />
                      ) : (
                        <MdClose size={20} aria-label="Unpaid" role="img" className="text-red-500" />
                      )}
                    </span>
                  </Link>
                );
              })}
              {runs.length < person.runCount && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full min-h-11 bg-transparent border-0 border-t border-divider cursor-pointer font-heading font-semibold text-[13px] text-accent"
                >
                  {loadingMore
                    ? "Loading…"
                    : `Show more (${person.runCount - runs.length} older)`}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!person && ranked.length > 0 && (
        <section>
          <h3 className="font-heading font-medium text-base mt-1 mb-2">By player</h3>
          <div className="rounded-lg bg-surface shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 text-[10px] tracking-[0.08em] uppercase text-neutral-500 border-b border-divider">
              <span className="flex-1">Player</span>
              <span className="w-12 text-right">Played</span>
              <span className="w-14 text-right">No-show</span>
            </div>
            {ranked.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPlayer(p.key, "ranked_list")}
                className="w-full flex items-center gap-2 px-3.5 min-h-11 bg-transparent border-0 border-b border-divider last:border-b-0 cursor-pointer text-left text-text"
              >
                <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">{p.name}</span>
                <span className="w-12 text-right text-[13px] tabular-nums">{p.played}</span>
                <span className="w-14 text-right text-[13px] tabular-nums text-neutral-400">
                  {percent(p.noShows, p.played)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
