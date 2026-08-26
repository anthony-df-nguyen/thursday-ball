import { auth } from "@/auth";
import { db } from "@/db";
import { setDefaultInviteMessage } from "../actions";
import { DEFAULT_INVITE_MESSAGE } from "@/lib/inviteMessage";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId
    ? await db.query.users.findFirst({ where: (users, { eq }) => eq(users.id, userId) })
    : undefined;

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <h2 className="text-2xl font-medium">Settings</h2>

      <div className="rounded-lg bg-surface shadow-sm p-4 mt-4">
        <h3 className="font-heading font-medium text-[15px]">Default text message</h3>
        <p className="text-[13px] text-neutral-400 mt-1">
          Used as the pre-filled text when you tap the message icon to invite someone.
        </p>
        <form action={setDefaultInviteMessage} className="mt-3.5 flex flex-col gap-2.5">
          <textarea
            className="input min-h-[84px] resize-none"
            name="message"
            defaultValue={user?.defaultInviteMessage ?? DEFAULT_INVITE_MESSAGE}
            maxLength={300}
          />
          <button type="submit" className="btn btn-filled self-start">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
