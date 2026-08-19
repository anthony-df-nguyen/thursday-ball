import { auth, signOut } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <>
      <AppHeader userName={session?.user?.name} signOutAction={signOutAction} />
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav />
    </>
  );
}
