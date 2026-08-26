import Link from "next/link";
import { db } from "@/db";
import { createEvent } from "./actions";
import { NewRunForm } from "@/components/NewRunForm";
import { RunCard } from "@/components/RunCard";

export default async function RunsPage() {
  const allEvents = await db.query.events.findMany({
    orderBy: (events, { desc }) => [desc(events.date)],
    with: { attendees: { with: { plusOnes: true } } },
  });

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
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

      {allEvents.map((event) => (
        <RunCard key={event.id} event={event} />
      ))}

      {allEvents.length === 0 && (
        <p className="text-sm text-neutral-500 my-2">No open runs. Create one for Thursday.</p>
      )}
    </div>
  );
}
