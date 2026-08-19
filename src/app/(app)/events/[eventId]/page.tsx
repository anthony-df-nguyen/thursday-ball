import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  addAdHocAttendee,
  addPlusOne,
  addRegularToEvent,
  deleteEvent,
  removeAttendee,
  removePlusOne,
  setAttendeePaid,
  setInviteStatus,
  setPlusOnePaid,
} from "../../actions";

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: (events, { eq }) => eq(events.id, eventId),
    with: {
      attendees: {
        with: { plusOnes: true, regular: true },
      },
    },
  });

  if (!event) notFound();

  const allRegulars = await db.query.regulars.findMany({
    orderBy: (regulars, { asc }) => [asc(regulars.name)],
  });

  const attendeeRegularIds = new Set(
    event.attendees.map((a) => a.regularId).filter(Boolean),
  );
  const availableRegulars = allRegulars.filter(
    (r) => !attendeeRegularIds.has(r.id),
  );

  const headcount = event.attendees.reduce((sum, a) => {
    if (a.inviteStatus !== "confirmed") return sum;
    return sum + 1 + a.plusOnes.length;
  }, 0);
  const atCapacity = headcount >= event.capacity;

  const totalPeople = event.attendees.reduce(
    (sum, a) => sum + 1 + a.plusOnes.length,
    0,
  );
  const paidCount = event.attendees.reduce(
    (sum, a) =>
      sum + (a.paid ? 1 : 0) + a.plusOnes.filter((p) => p.paid).length,
    0,
  );
  const everyonePaid = totalPeople > 0 && paidCount === totalPeople;

  return (
    <div className="px-4 py-4">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {new Date(event.date + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h1>
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        {headcount}/{event.capacity} confirmed · {paidCount}/{totalPeople}{" "}
        paid
      </p>

      {everyonePaid && (
        <form
          action={async () => {
            "use server";
            await deleteEvent(event.id);
          }}
          className="mb-4"
        >
          <button className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white active:scale-95">
            Everyone paid — delete event
          </button>
        </form>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">
          Add from regulars
        </h2>
        <div className="flex flex-wrap gap-2">
          {availableRegulars.length === 0 && (
            <p className="text-xs text-neutral-500">
              Everyone on the roster is already on this event.
            </p>
          )}
          {availableRegulars.map((regular) => (
            <form
              key={regular.id}
              action={async () => {
                "use server";
                await addRegularToEvent(event.id, regular.id);
              }}
            >
              <button
                disabled={atCapacity}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-neutral-700"
              >
                + {regular.name}
              </button>
            </form>
          ))}
        </div>
        <form
          action={async (formData: FormData) => {
            "use server";
            await addAdHocAttendee(event.id, formData);
          }}
          className="mt-2 flex gap-2"
        >
          <input
            type="text"
            name="displayName"
            placeholder="One-off name"
            disabled={atCapacity}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            disabled={atCapacity}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-neutral-700"
          >
            Add
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        {event.attendees.map((attendee) => (
          <div
            key={attendee.id}
            className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {attendee.regular?.name ?? attendee.displayName}
              </span>
              <form
                action={async () => {
                  "use server";
                  await removeAttendee(event.id, attendee.id);
                }}
              >
                <button className="text-xs text-red-600">Remove</button>
              </form>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {(["invited", "confirmed", "declined"] as const).map(
                (status) => (
                  <form
                    key={status}
                    action={async () => {
                      "use server";
                      await setInviteStatus(event.id, attendee.id, status);
                    }}
                  >
                    <button
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                        attendee.inviteStatus === status
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "border border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {status}
                    </button>
                  </form>
                ),
              )}

              <form
                action={async () => {
                  "use server";
                  await setAttendeePaid(event.id, attendee.id, !attendee.paid);
                }}
                className="ml-auto"
              >
                <button
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    attendee.paid
                      ? "bg-green-600 text-white"
                      : "border border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  {attendee.paid ? "Paid ✓" : "Unpaid"}
                </button>
              </form>
            </div>

            {attendee.plusOnes.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                {attendee.plusOnes.map((plusOne) => (
                  <li
                    key={plusOne.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{plusOne.name ?? "+1"}</span>
                    <div className="flex items-center gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await setPlusOnePaid(
                            event.id,
                            plusOne.id,
                            !plusOne.paid,
                          );
                        }}
                      >
                        <button
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            plusOne.paid
                              ? "bg-green-600 text-white"
                              : "border border-neutral-300 text-neutral-500 dark:border-neutral-700"
                          }`}
                        >
                          {plusOne.paid ? "Paid ✓" : "Unpaid"}
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await removePlusOne(event.id, plusOne.id);
                        }}
                      >
                        <button className="text-xs text-red-600">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={async (formData: FormData) => {
                "use server";
                await addPlusOne(event.id, attendee.id, formData);
              }}
              className="mt-2 flex gap-2"
            >
              <input
                type="text"
                name="name"
                placeholder="+1 name (optional)"
                disabled={atCapacity}
                className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                disabled={atCapacity}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
              >
                + Add +1
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
