export function nextThursdayISO() {
  const d = new Date();
  const add = ((4 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

export function formatRunDate(iso: string) {
  const d = new Date(iso + "T12:00");
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  return { date, weekday };
}

export function formatRunDateLong(iso: string) {
  const d = new Date(iso + "T12:00");
  const date = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  return { date, weekday };
}
