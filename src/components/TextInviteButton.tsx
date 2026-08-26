import { FaRegMessage } from "react-icons/fa6";
import { DEFAULT_INVITE_MESSAGE } from "@/lib/inviteMessage";

export function TextInviteButton({
  phone,
  message,
}: {
  phone: string;
  message?: string | null;
}) {
  const href = `sms:${phone}?&body=${encodeURIComponent(message || DEFAULT_INVITE_MESSAGE)}`;

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
