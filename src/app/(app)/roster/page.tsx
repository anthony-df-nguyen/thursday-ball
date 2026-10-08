import { db } from "@/db";
import { createRegular, deleteRegular, updateRegular } from "../actions";
import { EditRegularSheet } from "@/components/EditRegularSheet";
import { InfoTooltip } from "@/components/InfoTooltip";

export default async function RosterPage() {
  const allRegulars = await db.query.regulars.findMany({
    orderBy: (regulars, { asc }) => [asc(regulars.name)],
  });

  return (
    <div className="flex-1 px-4 pt-5 pb-6 md:px-8 md:pt-8">
      <div className="flex items-baseline gap-2">
        {" "}
        <h2 className="text-2xl font-medium">Roster</h2>
        <InfoTooltip text="Regulars are quick to add to future runs — include a phone number to text them easily. No need to add someone here first; you can invite one-off names directly to a run." />
      </div>

      <form action={createRegular} className="mt-6 flex gap-2 md:max-w-full">
        <input
          className="input min-h-[36px]"
          type="text"
          name="name"
          placeholder="Add a regular"
          maxLength={40}
          required
        />
        <button type="submit" className="btn btn-filled min-h-[36px] flex-none">
          Add <span className="hidden md:block">Player</span>
        </button>
      </form>

      <div className="mt-3.5" />

      <div className="md:grid md:grid-cols-1 md:gap-x-8">
        {allRegulars.map((regular) => (
          <EditRegularSheet
            key={regular.id}
            regular={regular}
            isOrganizer={regular.isOrganizer}
            updateRegular={updateRegular}
            deleteRegular={deleteRegular}
          />
        ))}
      </div>
    </div>
  );
}
