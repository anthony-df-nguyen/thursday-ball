"use client";

import { useEffect, useRef, useState } from "react";
import { MdInfoOutline } from "react-icons/md";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <span className="relative inline-flex items-center group" ref={ref}>
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center text-neutral-500 hover:text-text cursor-pointer bg-none border-none p-0.5"
      >
        <MdInfoOutline size={16} />
      </button>
      <span
        role="tooltip"
        className={`absolute left-0 top-[calc(100%+6px)] z-10 w-max max-w-[240px] rounded-md bg-surface border border-divider shadow-md px-2.5 py-2 text-xs text-neutral-400 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
