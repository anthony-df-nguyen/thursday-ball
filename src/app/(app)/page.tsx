import Link from "next/link";
import { db } from "@/db";
import { createEvent } from "./actions";

export default async function EventsPage() {
  const allEvents = await db.query.events.findMany({
    orderBy: (events, { desc }) => [desc(events.date)],
    with: { attendees: { with: { plusOnes: true } } },
  });

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Events</h1>

      <form action={createEvent} className="mb-6 flex gap-2">
        <input
          type="date"
          name="date"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white active:scale-95"
        >
          New event
        </button>
      </form>

      {allEvents.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No events yet — create one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {allEvents.map((event) => {
            const headcount = event.attendees.reduce((sum, a) => {
              if (a.inviteStatus !== "confirmed") return sum;
              return sum + 1 + a.plusOnes.length;
            }, 0);
            const totalPeople = event.attendees.reduce(
              (sum, a) => sum + 1 + a.plusOnes.length,
              0,
            );
            const paidCount = event.attendees.reduce((sum, a) => {
              return (
                sum +
                (a.paid ? 1 : 0) +
                a.plusOnes.filter((p) => p.paid).length
              );
            }, 0);

            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <span className="font-medium">
                    {new Date(event.date + "T00:00:00").toLocaleDateString(
                      undefined,
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {headcount}/{event.capacity} going · {paidCount}/
                    {totalPeople} paid
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
