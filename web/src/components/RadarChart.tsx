import { CapabilityScores, SCORE_LABELS } from "@/lib/types";

interface RadarChartProps {
  scores: CapabilityScores;
  size?: number;
}

const DIMENSIONS: (keyof CapabilityScores)[] = [
  "reliability",
  "safety",
  "capability",
  "reputation",
  "usability",
];

// 计算多边形顶点坐标，5 个轴均匀分布（72度间隔）
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number
): [number, number] {
  // 从顶部开始（-90度），顺时针分布
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function makePolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  total: number
): string {
  return Array.from({ length: total })
    .map((_, i) => polarToCartesian(cx, cy, radius, i, total).join(","))
    .join(" ");
}

export default function RadarChart({ scores, size = 300 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38; // 留出标签空间
  const total = DIMENSIONS.length;

  // 背景网格层级：25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // 数据多边形
  const dataPoints = DIMENSIONS.map((dim, i) => {
    const value = scores[dim] / 10; // 归一化到 0-1
    return polarToCartesian(cx, cy, maxRadius * value, i, total);
  });
  const dataPolygon = dataPoints.map((p) => p.join(",")).join(" ");

  // 标签位置（稍微偏移到网格外）
  const labelRadius = maxRadius + 24;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="drop-shadow-lg"
    >
      {/* 背景网格 */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={makePolygonPoints(cx, cy, maxRadius * level, total)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* 轴线 */}
      {DIMENSIONS.map((_, i) => {
        const [x, y] = polarToCartesian(cx, cy, maxRadius, i, total);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}

      {/* 数据区域 */}
      <polygon
        points={dataPolygon}
        fill="rgba(59,130,246,0.25)"
        stroke="#3B82F6"
        strokeWidth={2}
      />

      {/* 数据点 */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="#3B82F6" />
      ))}

      {/* 轴标签 */}
      {DIMENSIONS.map((dim, i) => {
        const [x, y] = polarToCartesian(cx, cy, labelRadius, i, total);
        return (
          <text
            key={dim}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-400 text-xs"
            fontSize={12}
          >
            {SCORE_LABELS[dim]}
          </text>
        );
      })}

      {/* 分数值 */}
      {DIMENSIONS.map((dim, i) => {
        const value = scores[dim];
        const [x, y] = polarToCartesian(
          cx,
          cy,
          maxRadius * (value / 10) + 14,
          i,
          total
        );
        return (
          <text
            key={`val-${dim}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-blue-400 font-bold"
            fontSize={10}
          >
            {value.toFixed(1)}
          </text>
        );
      })}
    </svg>
  );
}
