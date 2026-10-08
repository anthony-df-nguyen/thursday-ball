"use client";

import { usePathname, useRouter } from "next/navigation";

export const NAV_ITEMS = [
  { label: "Runs", href: "/" },
  { label: "Roster", href: "/roster" },
] as const;

export function isNavItemActive(href: string, pathname: string) {
  const onRoster = pathname.startsWith("/roster");
  return href === "/roster" ? onRoster : !onRoster;
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="sticky bottom-0 z-10 bg-bg border-t border-divider flex md:hidden">
      {NAV_ITEMS.map((item, i) => (
        <button
          key={item.href}
          type="button"
          onClick={() => router.push(item.href)}
          className={`flex-1 flex items-center justify-center gap-2 min-h-12 px-4 bg-none border-0 cursor-pointer font-heading font-semibold text-[13px] ${
            i > 0 ? "border-l border-divider" : ""
          } ${isNavItemActive(item.href, pathname) ? "text-accent" : "text-neutral-500"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
