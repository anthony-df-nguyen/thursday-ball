function barColor(headcount: number) {
  if (headcount >= 13) return "bg-green-500";
  if (headcount >= 12) return "bg-yellow-500";
  if (headcount >= 10) return "bg-orange-500";
  return "bg-red-500";
}

export function HeadcountBar({
  headcount,
  capacity,
}: {
  headcount: number;
  capacity: number;
}) {
  const fillColor = barColor(headcount);

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
