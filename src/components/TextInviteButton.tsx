import { FaRegMessage } from "react-icons/fa6";

const INVITE_MESSAGE = "Are you free to ball this Thursday?";

export function TextInviteButton({ phone }: { phone: string }) {
  const href = `sms:${phone}?&body=${encodeURIComponent(INVITE_MESSAGE)}`;

  return (
    <a
      href={href}
      aria-label="Text invite"
      className="w-6 h-11 flex items-center justify-center text-neutral-600 flex-none"
    >
      <FaRegMessage size={15} />
    </a>
  );
}
