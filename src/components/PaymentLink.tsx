"use client";

import posthog from "posthog-js";

// A payee's Venmo / Cash App link on the public RSVP page.
export function PaymentLink({
  href,
  method,
  children,
}: {
  href: string;
  method: "venmo" | "cash_app";
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => posthog.capture("payment_link_clicked", { method })}
      className="font-semibold text-accent underline"
    >
      {children}
    </a>
  );
}
