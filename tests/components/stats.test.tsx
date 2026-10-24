// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsView } from "@/components/StatsView";
import { ArchivedRuns } from "@/components/ArchivedRuns";
import type { PersonStats, RunEntry } from "@/db/stats";

const months = [
  { key: "2026-08", short: "Aug", long: "August 2026" },
  { key: "2026-09", short: "Sep", long: "September 2026" },
  { key: "2026-10", short: "Oct", long: "October 2026" },
];

const person = (over: Partial<PersonStats> & { key: string; name: string }): PersonStats => ({
  played: 0,
  noShows: 0,
  lastPlayed: null,
  byMonth: {},
  runs: [],
  runCount: 0,
  ...over,
});

const ann = person({
  key: "r1",
  name: "Ann",
  played: 3,
  noShows: 1,
  lastPlayed: "2026-10-15",
  byMonth: { "2026-09": { played: 1, noShows: 1 }, "2026-10": { played: 2, noShows: 0 } },
  runs: [
    { eventId: "e2", date: "2026-10-15", result: "played", paid: true },
    { eventId: "e1", date: "2026-09-10", result: "no_show", paid: false },
  ],
  runCount: 4,
});
const bob = person({ key: "r2", name: "Bob", played: 5, noShows: 0 });
const idle = person({ key: "r3", name: "Idle" });

function setup(loadMoreRuns = vi.fn(async (): Promise<RunEntry[]> => [])) {
  render(
    <StatsView
      people={[ann, bob, idle]}
      runsByMonth={{ "2026-09": 2, "2026-10": 4 }}
      months={months}
      loadMoreRuns={loadMoreRuns}
    />,
  );
  return loadMoreRuns;
}

describe("StatsView overview", () => {
  it("shows runs held and average players per run", () => {
    setup();
    // 6 runs held; (3 + 5) played / 6 = 1.3
    expect(screen.getByText("Runs held").nextSibling).toHaveTextContent("6");
    expect(screen.getByText("Avg. players per run").nextSibling).toHaveTextContent("1.3");
  });

  it("selects the latest month and lets you pick another", async () => {
    setup();
    expect(screen.getByText(/October 2026:/)).toHaveTextContent("4 runs");
    await userEvent.click(screen.getByRole("button", { name: "September 2026: 2 runs" }));
    expect(screen.getByText(/September 2026:/)).toHaveTextContent("2 runs");
  });

  it("ranks players by runs played and hides people with no history", () => {
    setup();
    const rows = screen
      .getAllByRole("button")
      .filter((b) => b.querySelectorAll("span").length === 3)
      .map((b) => [...b.querySelectorAll("span")].map((c) => c.textContent));
    // Name, runs played, no-show rate. Idle has no history so isn't listed.
    expect(rows).toEqual([
      ["Bob", "5", "0%"],
      ["Ann", "3", "25%"],
    ]);
  });

  it("opens a player from the ranking", async () => {
    setup();
    const row = screen.getByText("Ann", { selector: "span" }).closest("button")!;
    await userEvent.click(row);
    expect(screen.getByText("← Back to Everyone")).toBeInTheDocument();
  });
});

describe("StatsView player", () => {
  async function openAnn(loadMore?: ReturnType<typeof vi.fn>) {
    const fn = setup(loadMore as never);
    await userEvent.selectOptions(screen.getByRole("combobox"), "r1");
    return fn;
  }

  it("shows played, last played, no-shows and no-show rate", async () => {
    await openAnn();
    expect(screen.getByText("Runs played", { selector: "div" }).nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Last played", { selector: "div" }).nextSibling).toHaveTextContent("Oct 15, 2026");
    expect(screen.getByText("No-shows", { selector: "div" }).nextSibling).toHaveTextContent("1");
    expect(screen.getByText("No-show rate", { selector: "div" }).nextSibling).toHaveTextContent("25%");
  });

  it("switches the chart between played and no-shows", async () => {
    await openAnn();
    expect(screen.getByText(/October 2026:/)).toHaveTextContent("2 played");
    await userEvent.click(screen.getByRole("tab", { name: "No-shows" }));
    await userEvent.click(screen.getByRole("button", { name: "September 2026: 1 no-shows" }));
    expect(screen.getByText(/September 2026:/)).toHaveTextContent("1 no-shows");
  });

  it("lists run history with result and payment", async () => {
    await openAnn();
    expect(screen.getByRole("link", { name: /Oct 15, 2026/ })).toHaveAttribute("href", "/events/e2");
    expect(screen.getByRole("link", { name: /Oct 15, 2026/ })).toHaveTextContent("Played");
    expect(screen.getByLabelText("Paid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sep 10, 2026/ })).toHaveTextContent("No-show");
    expect(screen.getByLabelText("Not applicable")).toBeInTheDocument();
  });

  it("loads older runs from where the list left off", async () => {
    const older: RunEntry[] = [{ eventId: "e0", date: "2026-08-01", result: "played", paid: false }];
    const loadMore = vi.fn(async () => older);
    await openAnn(loadMore);
    await userEvent.click(screen.getByRole("button", { name: "Show more (2 older)" }));
    expect(loadMore).toHaveBeenCalledWith("r1", 2);
    expect(await screen.findByRole("link", { name: /Aug 1, 2026/ })).toBeInTheDocument();
  });

  it("explains an empty history", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "r3");
    expect(screen.getByText("No runs recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("No-show rate", { selector: "div" }).nextSibling).toHaveTextContent("—");
  });

  it("goes back to the overview", async () => {
    await openAnn();
    await userEvent.click(screen.getByText("← Back to Everyone"));
    expect(screen.getByText("Runs held")).toBeInTheDocument();
  });
});

describe("ArchivedRuns", () => {
  const run = (id: string, date: string, headcount: number, unpaid: number) => ({ id, date, headcount, unpaid });
  const open = (el: HTMLElement) => {
    const details = el.closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
  };

  it("loads nothing until expanded, then shows runs grouped by month", async () => {
    const get = vi.fn(async () => ({
      runs: [run("a", "2026-10-15", 12, 0), run("b", "2026-09-10", 10, 3), run("c", "2026-09-03", 0, 0)],
      nextCursor: null,
    }));
    render(<ArchivedRuns count={3} getArchivedRuns={get} />);
    expect(get).not.toHaveBeenCalled();

    open(screen.getByText("Archived (3)"));
    expect(await screen.findByText("October 2026")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(null);
    expect(screen.getByText("September 2026")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Oct 15, 2026/ })).toHaveAttribute("href", "/events/a");
    expect(screen.getByLabelText("All paid")).toBeInTheDocument();
    expect(screen.getByText("3 unpaid")).toBeInTheDocument();
    expect(screen.getByLabelText("No one confirmed")).toBeInTheDocument();
  });

  it("pages with the returned cursor and appends", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ runs: [run("a", "2026-10-15", 12, 0)], nextCursor: { date: "2026-10-15", id: "a" } })
      .mockResolvedValueOnce({ runs: [run("b", "2026-09-10", 10, 0)], nextCursor: null });
    render(<ArchivedRuns count={2} getArchivedRuns={get} />);
    open(screen.getByText("Archived (2)"));
    await userEvent.click(await screen.findByRole("button", { name: "Show 1 more (1 left)" }));
    await waitFor(() => expect(screen.getByRole("link", { name: /Sep 10, 2026/ })).toBeInTheDocument());
    expect(get).toHaveBeenLastCalledWith({ date: "2026-10-15", id: "a" });
    expect(screen.getByRole("link", { name: /Oct 15, 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more/ })).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ runs: [run("a", "2026-10-15", 12, 0)], nextCursor: null });
    render(<ArchivedRuns count={1} getArchivedRuns={get} />);
    open(screen.getByText("Archived (1)"));
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: /Oct 15, 2026/ })).toBeInTheDocument();
  });
});
