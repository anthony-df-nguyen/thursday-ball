// Full court (5v5) needs 10, so any run with room for 10+ is a full-court run.
// Smaller runs are half court, where 2v2, 3v3 and 4v4 all work: 4 is the minimum.
export function minToPlay(capacity: number) {
  return capacity >= 10 ? 10 : 4;
}

export function barColor(headcount: number, capacity: number) {
  if (headcount < minToPlay(capacity)) return "bg-red-500";
  if (headcount >= capacity - 1) return "bg-green-500";
  if (headcount >= capacity - 2) return "bg-yellow-500";
  return "bg-orange-500";
}

export function HeadcountBar({
  headcount,
  capacity,
}: {
  headcount: number;
  capacity: number;
}) {
  const fillColor = barColor(headcount, capacity);

  return (
    <div className="flex gap-0.5 rounded-sm overflow-hidden">
      {Array.from({ length: capacity }, (_, i) => (
        <span
          key={i}
          className={`flex-1 h-2 ${i < headcount ? fillColor : "bg-neutral-800"}`}
        />
      ))}
    </div>
  );
}
