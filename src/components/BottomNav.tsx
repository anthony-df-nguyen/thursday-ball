import Link from "next/link";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-black/95">
      <Link
        href="/"
        className="flex-1 py-3 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        Events
      </Link>
      <Link
        href="/roster"
        className="flex-1 py-3 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        Regulars
      </Link>
    </nav>
  );
}
