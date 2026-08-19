export function nextThursdayISO() {
  const d = new Date();
  const add = ((4 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

export function formatRunDate(iso: string) {
  return new Date(iso + "T12:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatRunDateLong(iso: string) {
  return new Date(iso + "T12:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
