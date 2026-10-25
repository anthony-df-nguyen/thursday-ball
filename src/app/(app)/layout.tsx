import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { regulars } from "@/db/schema";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  // Organizers are regulars too; PostHog identifies them by the roster id so
  // they're one person across the app and their own RSVP link.
  const regular = session?.user?.id
    ? await db.query.regulars.findFirst({
        where: eq(regulars.userId, session.user.id),
        columns: { id: true },
      })
    : undefined;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <>
      {session?.user?.id && (
        <AppHeader
          userId={session.user.id}
          analyticsId={regular?.id ?? session.user.id}
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image}
          signOutAction={signOutAction}
        />
      )}
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav />
    </>
  );
}
