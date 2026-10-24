import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { createEvent, getArchivedRuns } from "./actions";
import { ArchivedRuns } from "@/components/ArchivedRuns";
import { NewRunForm } from "@/components/NewRunForm";
import { RunCard } from "@/components/RunCard";

export default async function RunsPage() {
  // Archived runs are only counted here; their cards load when expanded.
  const [allEvents, archivedCount] = await Promise.all([
    db.query.events.findMany({
      where: eq(events.status, "open"),
      orderBy: (events, { desc }) => [desc(events.date)],
      with: { attendees: { with: { plusOnes: true } } },
    }),
    db.$count(events, eq(events.status, "closed")),
  ]);

  return (
    <div className="flex-1 px-4 pt-5 pb-6 md:px-8 md:pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium">Runs</h2>
        <NewRunForm createEvent={createEvent} />
      </div>

      <Link
        href="/help"
        className="inline-block mt-1.5 text-[13px] font-semibold text-accent no-underline"
      >
        How to use this app →
      </Link>

      <div className="mt-4" />

      <div className="grid gap-3.5">
        {allEvents.map((event) => (
          <RunCard key={event.id} event={event} />
        ))}
      </div>

      {allEvents.length === 0 && (
        <p className="text-sm text-neutral-500 my-2">No open runs. Create one for Thursday.</p>
      )}

      {archivedCount > 0 && (
        // Keyed on the count so the loaded list resets after an archive,
        // unarchive, or delete changes it.
        <ArchivedRuns
          key={archivedCount}
          count={archivedCount}
          getArchivedRuns={getArchivedRuns}
        />
      )}
    </div>
  );
}
