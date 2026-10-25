// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ph = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: ph }));

import { StatsView } from "@/components/StatsView";
import type { PersonStats } from "@/db/stats";

const months = [{ key: "2026-10", short: "Oct", long: "October 2026" }];

const person = (key: string, name: string, over: Partial<PersonStats> = {}): PersonStats => ({
  key,
  name,
  played: 2,
  noShows: 1,
  lastPlayed: null,
  byMonth: {},
  runs: [{ eventId: "e1", date: "2026-10-15", result: "played", paid: true }],
  runCount: 3,
  ...over,
});

function setup() {
  const loadMoreRuns = vi.fn(async () => []);
  render(
    <StatsView
      people={[person("r1", "Ann"), person("name:Zed Former", "Zed Former")]}
      runsByMonth={{ "2026-10": 4 }}
      months={months}
      loadMoreRuns={loadMoreRuns}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("Stats tracking", () => {
  it("captures picking a player from the dropdown, by roster id", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "r1");
    expect(ph.capture).toHaveBeenCalledWith("stats_person_selected", {
      player_type: "regular",
      player_id: "r1",
      source: "dropdown",
    });
  });

  it("captures picking from the ranked list and going back", async () => {
    setup();
    await userEvent.click(screen.getByText("Ann", { selector: "span" }).closest("button")!);
    expect(ph.capture).toHaveBeenCalledWith("stats_person_selected", {
      player_type: "regular",
      player_id: "r1",
      source: "ranked_list",
    });
    await userEvent.click(screen.getByText("← Back to Everyone"));
    expect(ph.capture).toHaveBeenCalledWith("stats_person_selected", {
      player_type: "everyone",
      source: "back",
    });
  });

  it("never sends a former player's name", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "name:Zed Former");
    expect(ph.capture).toHaveBeenCalledWith("stats_person_selected", {
      player_type: "former",
      source: "dropdown",
    });
    expect(JSON.stringify(ph.capture.mock.calls)).not.toContain("Zed");
  });

  it("captures switching the chart metric", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "r1");
    await userEvent.click(screen.getByRole("tab", { name: "No-shows" }));
    expect(ph.capture).toHaveBeenCalledWith("stats_metric_changed", {
      metric: "noShows",
      player_type: "regular",
      player_id: "r1",
    });
  });

  it("captures loading more history, with how much was already shown", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "r1");
    await userEvent.click(screen.getByRole("button", { name: /Show more/ }));
    await waitFor(() =>
      expect(ph.capture).toHaveBeenCalledWith("stats_runs_loaded_more", {
        player_type: "regular",
        player_id: "r1",
        loaded_so_far: 1,
      }),
    );
  });
});
