import { FaRegMessage } from "react-icons/fa6";
import { DEFAULT_INVITE_MESSAGE } from "@/lib/inviteMessage";

export function TextInviteButton({
  phone,
  message,
  rsvpUrl,
}: {
  phone: string;
  message?: string | null;
  rsvpUrl?: string;
}) {
  const text = message || DEFAULT_INVITE_MESSAGE;
  const body = rsvpUrl ? `${text}\n${rsvpUrl}` : text;
  const href = `sms:${phone}?&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      aria-label="Text invite"
      className="w-6 h-11 flex items-center justify-center text-neutral-600 hover:text-text flex-none"
    >
      <FaRegMessage size={15} />
    </a>
  );
}
