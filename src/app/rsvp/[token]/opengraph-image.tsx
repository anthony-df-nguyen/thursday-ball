import { ImageResponse } from "next/og";
import { formatRunDateLong } from "@/lib/dates";
import { runForToken } from "@/lib/rsvp";

export const alt = "Thursday Ball RSVP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card shown in iMessage / Google Messages when an RSVP link is texted.
export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await runForToken(token);
  const long = event ? formatRunDateLong(event.date) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #161826 0%, #2b2741 100%)",
          color: "#e9e9ed",
        }}
      >
        <div style={{ fontSize: 200, display: "flex" }}>🏀</div>
        <div style={{ fontSize: 84, fontWeight: 700, display: "flex" }}>
          Thursday Ball
        </div>
        {long && (
          <div style={{ fontSize: 52, color: "#b5abfc", marginTop: 12, display: "flex" }}>
            {long.weekday}, {long.date}
          </div>
        )}
        <div style={{ fontSize: 40, color: "#b2b6ca", marginTop: 28, display: "flex" }}>
          Tap to RSVP
        </div>
      </div>
    ),
    { ...size },
  );
}
