"use client";

import { usePathname, useRouter } from "next/navigation";

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return chars.join("").toUpperCase();
}

export function AppHeader({
  userName,
  signOutAction,
}: {
  userName: string | null | undefined;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isEvent = pathname.startsWith("/events/");

  return (
    <div className="sticky top-0 z-10 bg-bg border-b border-divider flex items-center gap-1.5 px-2 min-h-[54px]">
      {isEvent && (
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back"
          className="w-11 h-11 bg-none border-none cursor-pointer text-lg text-text p-0"
        >
          ←
        </button>
      )}
      <div className="font-heading font-semibold text-[15px] tracking-[0.01em] pl-2">
        Thursday Ball
      </div>
      <form action={signOutAction} className="ml-auto mr-2">
        <button
          type="submit"
          title="Sign out"
          className="w-8 h-8 rounded-md bg-surface text-accent border border-divider flex items-center justify-center font-heading font-semibold text-[11px] cursor-pointer"
        >
          {initialsOf(userName)}
        </button>
      </form>
    </div>
  );
}
