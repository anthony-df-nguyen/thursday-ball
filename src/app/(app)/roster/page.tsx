import { db } from "@/db";
import { createRegular, deleteRegular } from "../actions";

export default async function RosterPage() {
  const allRegulars = await db.query.regulars.findMany({
    orderBy: (regulars, { asc }) => [asc(regulars.name)],
  });

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">Regulars</h1>

      <form action={createRegular} className="mb-6 flex flex-col gap-2">
        <input
          type="text"
          name="name"
          placeholder="Name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="flex gap-2">
          <input
            type="text"
            name="nickname"
            placeholder="Nickname (optional)"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone (optional)"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white active:scale-95"
        >
          Add regular
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {allRegulars.map((regular) => (
          <li
            key={regular.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
          >
            <div>
              <p className="font-medium">
                {regular.name}
                {regular.isOrganizer && (
                  <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-neutral-100 dark:text-black">
                    ORGANIZER
                  </span>
                )}
              </p>
              {regular.nickname && (
                <p className="text-xs text-neutral-500">
                  &ldquo;{regular.nickname}&rdquo;
                </p>
              )}
            </div>
            {!regular.isOrganizer && (
              <form
                action={async () => {
                  "use server";
                  await deleteRegular(regular.id);
                }}
              >
                <button className="text-xs text-red-600">Remove</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
