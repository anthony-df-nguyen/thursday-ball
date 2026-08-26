const INVITE_MESSAGE = "Are you free to ball this Thursday?";

export function TextInviteButton({ phone }: { phone: string }) {
  const href = `sms:${phone}?&body=${encodeURIComponent(INVITE_MESSAGE)}`;

  return (
    <a
      href={href}
      aria-label="Text invite"
      className="w-6 h-11 flex items-center justify-center text-neutral-600 flex-none"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </a>
  );
}
