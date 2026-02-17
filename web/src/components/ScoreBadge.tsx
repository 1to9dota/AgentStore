interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({
  score,
  label,
  size = "md",
}: ScoreBadgeProps) {
  // 根据分数决定颜色：>= 7 绿色，>= 5 黄色，< 5 红色
  const colorClass =
    score >= 7
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 5
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/20 text-red-400 border-red-500/30";

  const sizeClass =
    size === "sm"
      ? "text-xs px-1.5 py-0.5"
      : size === "lg"
        ? "text-lg px-3 py-1.5 font-bold"
        : "text-sm px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${colorClass} ${sizeClass}`}
    >
      {label && <span className="opacity-70">{label}</span>}
      <span className="font-semibold">{score.toFixed(1)}</span>
    </span>
  );
}
