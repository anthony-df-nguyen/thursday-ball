import { loadMorePersonRuns } from "../actions";
import { getStats } from "@/db/stats";
import { InfoTooltip } from "@/components/InfoTooltip";
import { StatsView } from "@/components/StatsView";

const MONTHS_SHOWN = 6;

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const short = d.toLocaleDateString("en-US", { month: "short" });
    const long = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return { key, short, long };
  });
}

export default async function StatsPage() {
  const { people, runsByMonth } = await getStats();

  return (
    <div className="flex-1 px-4 pt-5 pb-6 md:px-8 md:pt-8">
      <div className="flex items-baseline gap-2 mb-4">
        <h2 className="text-2xl font-medium">Stats</h2>
        <InfoTooltip text="Note: stat tracking only started October 1, 2026. Every run that has happened counts. Only tracks people that are added in the app on the ROSTER, +1s aren't tracked. IN is played; NO SHOW is a miss." />
      </div>

      <StatsView
        people={people}
        runsByMonth={runsByMonth}
        months={lastMonths(MONTHS_SHOWN)}
        loadMoreRuns={loadMorePersonRuns}
      />
    </div>
  );
}
