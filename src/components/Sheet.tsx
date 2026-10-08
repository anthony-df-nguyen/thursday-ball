"use client";

import { useEffect } from "react";

// Bottom sheet on mobile, centered modal on desktop (md+).
export function Sheet({
  open,
  onClose,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-end justify-center md:items-center md:p-6 bg-[color-mix(in_srgb,var(--color-neutral-900)_60%,transparent)]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[430px] md:max-w-md bg-surface rounded-t-lg md:rounded-lg shadow-lg px-4 pt-4 pb-7 md:pb-5 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
