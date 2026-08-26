"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return chars.join("").toUpperCase();
}

export function AppHeader({
  userName,
  userImage,
  signOutAction,
}: {
  userName: string | null | undefined;
  userImage: string | null | undefined;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isEvent = pathname.startsWith("/events/");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div className="sticky top-0 z-10 bg-bg border-b border-divider flex items-center gap-1.5 px-2 min-h-[54px]">
      {isEvent ? (
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 bg-none border-none cursor-pointer text-[15px] text-text pl-2 h-11"
        >
          <span aria-hidden="true" className="text-lg">←</span>
          Back to Runs
        </button>
      ) : (
        <Link
          href="/"
          className="font-heading font-semibold text-[15px] tracking-[0.01em] pl-2 flex items-center gap-1.5 text-text no-underline"
        >
          <span aria-hidden="true">🏀</span>
          Thursday Ball
        </Link>
      )}
      <div className="relative ml-auto mr-2" ref={menuRef}>
        <button
          type="button"
          title="Account"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 rounded-full bg-surface text-accent border border-divider flex items-center justify-center font-heading font-semibold text-[11px] cursor-pointer overflow-hidden"
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" className="w-full h-full object-cover" />
          ) : (
            initialsOf(userName)
          )}
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] min-w-[160px] rounded-lg bg-surface border border-divider shadow-lg overflow-hidden"
          >
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block px-3.5 py-2.5 text-[13px] text-text no-underline hover:bg-bg"
            >
              My Profile
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full text-left px-3.5 py-2.5 text-[13px] text-text bg-none border-none border-t border-divider cursor-pointer hover:bg-bg"
              >
                Sign Out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
