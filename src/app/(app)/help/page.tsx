import Link from "next/link";

const steps = [
  {
    title: "1. Create a run",
    body: 'Tap "New run" on the Runs tab and pick a date. It shows up at the top of the list as an open run.',
  },
  {
    title: "2. Build the invite list",
    body: 'Open the run, then add people from the Roster or type a one-off name. Everyone starts as "Asked" until you hear back from them. If someone has a phone number saved on the Roster, tap the text icon next to their name to open a pre-filled text invite.',
  },
  {
    title: "3. Track responses",
    body: 'As people reply outside the app (text, group chat), tap their status to mark them "confirmed" or "declined". Declined stays visible so you remember not to ask again — it just doesn\'t count toward the cap.',
  },
  {
    title: "4. Add +1s",
    body: "For anyone confirmed, add a +1 (name optional). Each +1 is tracked separately so you can mark them paid individually.",
  },
  {
    title: "5. Watch the cap",
    body: "Total headcount — confirmed people plus their +1s — is capped at 15. The app blocks confirming or adding a +1 once you're full.",
  },
  {
    title: "6. Collect payment",
    body: 'Check the paid box for each person and each +1 as they pay. The run shows "X of Y paid" at a glance.',
  },
  {
    title: "7. Close it out",
    body: "Once everyone (including +1s) is marked paid, delete the run from the menu. It asks you to confirm first — there's no history kept, so once it's gone, it's gone.",
  },
];

export default function HelpPage() {
  return (
    <div className=" px-4 pt-5 pb-6">
            <Link
        href="/"
        className="inline-block text-sm font-semibold text-accent no-underline mb-4"
      >
        ← Back to Runs
      </Link>
      <h2 className="text-xl font-medium">How to use this app</h2>

      <div className="mt-4 flex flex-col gap-3.5">
        {steps.map((step) => (
          <div key={step.title} className="rounded-lg bg-surface shadow-sm p-4">
            <div className="font-heading font-medium text-[15px]">
              {step.title}
            </div>
            <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">
              {step.body}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-surface shadow-sm p-4 mt-3.5">
        <div className="font-heading font-medium text-[15px]">
          A note on the Roster
        </div>
        <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">
          The Roster tab is your reusable list of regulars, organizers included,
          so you&apos;re not retyping names every week. Add someone once there
          and they&apos;ll show up in the picker for every future run. Save a
          phone number for them and a text icon shows up next to their name
          on runs, so you can text an invite straight from the app.
        </p>
      </div>
    </div>
  );
}
