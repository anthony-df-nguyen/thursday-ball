import Link from "next/link";
import { db } from "@/db";
import { createEvent } from "./actions";
import { NewRunForm } from "@/components/NewRunForm";
import { formatRunDate } from "@/lib/dates";

export default async function RunsPage() {
  const allEvents = await db.query.events.findMany({
    orderBy: (events, { desc }) => [desc(events.date)],
    with: { attendees: { with: { plusOnes: true } } },
  });

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[26px] font-medium">Runs</h2>
        <NewRunForm createEvent={createEvent} />
      </div>

      <Link
        href="/help"
        className="inline-block mt-1.5 text-[13px] font-semibold text-accent no-underline"
      >
        How to use this app →
      </Link>

      <div className="mt-4" />

      {allEvents.map((event) => {
        const headcount = event.attendees.reduce((sum, a) => {
          const confirmedPlusOnes = a.plusOnes.filter(
            (p) => p.inviteStatus === "confirmed",
          ).length;
          return (
            sum + (a.inviteStatus === "confirmed" ? 1 : 0) + confirmedPlusOnes
          );
        }, 0);
        const totalPeople = event.attendees.reduce((sum, a) => {
          const confirmedPlusOnes = a.plusOnes.filter(
            (p) => p.inviteStatus === "confirmed",
          ).length;
          return (
            sum + (a.inviteStatus === "confirmed" ? 1 : 0) + confirmedPlusOnes
          );
        }, 0);
        const paidCount = event.attendees.reduce((sum, a) => {
          const paidConfirmedPlusOnes = a.plusOnes.filter(
            (p) => p.inviteStatus === "confirmed" && p.paid,
          ).length;
          return (
            sum +
            (a.inviteStatus === "confirmed" && a.paid ? 1 : 0) +
            paidConfirmedPlusOnes
          );
        }, 0);
        const allPaid = totalPeople > 0 && paidCount === totalPeople;

        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="block rounded-lg bg-surface shadow-sm mb-3.5 overflow-hidden no-underline text-inherit"
          >
            <div className="p-4 flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">
                Open run
              </div>
              <div className="font-heading font-medium text-[26px] leading-[1.05]">
                {formatRunDate(event.date)}
              </div>
              <div className="text-[13px] text-neutral-400">
                {headcount} / {event.capacity} in ·{" "}
                {totalPeople ? `${paidCount} of ${totalPeople} paid` : "no one confirmed yet"}
              </div>
            </div>
            <div className="border-t border-divider px-4 py-2.5 flex justify-between items-center min-h-[44px]">
              <span className="text-[13px] font-semibold text-accent">Open →</span>
              {allPaid && <span className="tag tag-accent">ALL PAID</span>}
            </div>
          </Link>
        );
      })}

      {allEvents.length === 0 && (
        <p className="text-sm text-neutral-500 my-2">No open runs. Create one for Thursday.</p>
      )}
    </div>
  );
}
