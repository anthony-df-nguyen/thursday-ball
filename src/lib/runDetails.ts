// Time and place for a run. Every run is usually at the same time and spot, so
// these (overridable by env vars) prefill the New Run form; each run can still override them.
export function runDefaults() {
  return {
    capacity: parseCapacity(process.env.DEFAULT_RUN_CAPACITY ?? "14") ?? 14,
    startTime: process.env.DEFAULT_RUN_TIME ?? "21:00",
    locationName: process.env.DEFAULT_LOCATION_NAME ?? "Garden Grove Rec",
    locationAddress: process.env.DEFAULT_LOCATION_ADDRESS ?? "13641 Deodara Dr, Garden Grove, CA 92844",
  };
}

// "20:00" -> "8:00 PM".
export function formatRunTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Map link built from a typed address, so organizers never paste a URL. A
// Google Maps search link opens the Maps app on phones and the site elsewhere.
export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export const MAX_CAPACITY = 99;

// Trimmed text, or null when blank (the DB stores "no value" as null).
export function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() || null;
}

// A whole number from 1 to MAX_CAPACITY, or null for anything else.
export function parseCapacity(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_CAPACITY ? n : null;
}
