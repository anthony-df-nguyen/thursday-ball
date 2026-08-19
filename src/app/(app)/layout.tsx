import { auth, signOut } from "@/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="text-sm font-semibold">🏀 Thursday Ball</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-neutral-500 underline"
          >
            {session?.user?.name ?? "Sign out"}
          </button>
        </form>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
