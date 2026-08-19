"use client";

import { usePathname, useRouter } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onRoster = pathname.startsWith("/roster");

  return (
    <div className="sticky bottom-0 z-10 bg-bg border-t border-divider flex">
      <button
        type="button"
        onClick={() => router.push("/")}
        className={`flex-1 flex items-center justify-center gap-2 min-h-12 px-4 bg-none border-none cursor-pointer font-heading font-semibold text-[13px] ${
          onRoster ? "text-neutral-500" : "text-accent"
        }`}
      >
        Runs
      </button>
      <button
        type="button"
        onClick={() => router.push("/roster")}
        className={`flex-1 flex items-center justify-center gap-2 min-h-12 px-4 bg-none border-none border-l border-divider cursor-pointer font-heading font-semibold text-[13px] ${
          onRoster ? "text-accent" : "text-neutral-500"
        }`}
      >
        Roster
      </button>
    </div>
  );
}
