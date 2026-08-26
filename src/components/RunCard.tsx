import Link from "next/link";
import { HeadcountBar } from "@/components/HeadcountBar";
import { formatRunDate } from "@/lib/dates";
import type { db } from "@/db";

type EventWithAttendees = Awaited<
  ReturnType<typeof db.query.events.findMany<{ with: { attendees: { with: { plusOnes: true } } } }>>
>[number];

export function RunCard({ event }: { event: EventWithAttendees }) {
  const headcount = event.attendees.reduce((sum, a) => {
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
  const allPaid = headcount > 0 && paidCount === headcount;
  const { date, weekday } = formatRunDate(event.date);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-lg bg-surface shadow-sm mb-3.5 overflow-hidden no-underline text-inherit"
    >
      <div className="p-4 flex flex-col gap-1.5">
        <div className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">
          {weekday}
        </div>
        
        <div className="font-heading font-medium text-white text-xl leading-[1.05]">
          {date}{" "}

        </div>
        <div className="text-[13px] text-neutral-400 text-right">
          {headcount} / {event.capacity} in
        </div>
        <HeadcountBar headcount={headcount} capacity={event.capacity} />
      </div>
      <div className="border-t border-divider px-4 py-2.5 flex justify-between items-center min-h-[44px]">
        <span className="text-[13px] font-semibold text-accent">Open →</span>
        {allPaid ? (
          <span className="tag tag-success">ALL PAID</span>
        ) : (
          <span className="text-[13px] font-semibold text-neutral-400">
            {headcount ? `${paidCount} of ${headcount} Paid` : "No One Confirmed Yet"}
          </span>
        )}
      </div>
    </Link>
  );
}
