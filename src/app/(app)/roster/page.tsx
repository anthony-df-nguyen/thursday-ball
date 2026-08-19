import { db } from "@/db";
import { createRegular, deleteRegular, updateRegular } from "../actions";
import { EditRegularSheet } from "@/components/EditRegularSheet";

export default async function RosterPage() {
  const allRegulars = await db.query.regulars.findMany({
    orderBy: (regulars, { asc }) => [asc(regulars.name)],
  });

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <h2 className="text-[26px] font-medium">Roster</h2>
      <p className="text-[13px] text-neutral-400 mt-1 mb-3.5">
        {allRegulars.length} people. Organizers can&apos;t be removed.
      </p>

      <form action={createRegular} className="flex gap-2">
        <input className="input min-h-[36px]" type="text" name="name" placeholder="Add a name" required />
        <button type="submit" className="btn btn-primary min-h-[36px] flex-none">
          Add
        </button>
      </form>

      <div className="mt-3.5" />

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
  );
}
