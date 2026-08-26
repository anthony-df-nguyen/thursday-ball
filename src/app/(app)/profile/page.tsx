import { auth } from "@/auth";

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const chars =
    parts.length > 1
      ? [parts[0][0], parts[parts.length - 1][0]]
      : [parts[0][0]];
  return chars.join("").toUpperCase();
}

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <h2 className="text-2xl font-medium">My Profile</h2>

      <div className="rounded-lg bg-surface shadow-sm p-4 mt-4 flex items-center gap-3.5">
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-bg text-accent border border-divider flex items-center justify-center font-heading font-semibold text-lg">
            {initialsOf(user?.name)}
          </div>
        )}
        <div>
          <div className="font-heading font-medium text-[16px]">
            {user?.name ?? "Unknown"}
          </div>
          <div className="text-[13px] text-neutral-400 mt-0.5">
            {user?.email}
          </div>
        </div>
      </div>
    </div>
  );
}
