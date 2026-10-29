"use client";

import { useState } from "react";
import { cn, formatVND } from "@/lib/utils";

interface MultiSeries {
  label: string;
  values: number[];
  color?: string;
}

/** Utility to generate smooth bezier curve for SVG path */
function getSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) * 0.45;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) * 0.55;
    const cp2y = p1.y;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

/** Line chart (1 hoặc nhiều series) với curve mượt, gradient & hover tooltip */
export function LineChart({
  labels,
  series,
  height = 240,
}: {
  labels: string[];
  series: MultiSeries[];
  height?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const allValues = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const W = 1000;
  const H = 240;
  const padTop = 25;
  const padBottom = 35;
  const padLeft = 20;
  const padRight = 20;

  const graphWidth = W - padLeft - padRight;
  const graphHeight = H - padTop - padBottom;
  const pointCount = labels.length;

  const getCoordinates = (values: number[]) => {
    return values.map((v, i) => {
      const x = padLeft + (i * graphWidth) / Math.max(pointCount - 1, 1);
      const y = padTop + graphHeight - ((v - minVal) / range) * graphHeight;
      return { x, y, value: v };
    });
  };

  const seriesData = series.map((s, si) => {
    const color = s.color ?? (si === 0 ? "#8e1b2f" : "#00b8d9");
    const points = getCoordinates(s.values);
    const linePath = getSmoothPath(points);
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(H - padBottom).toFixed(
            2
          )} L ${points[0].x.toFixed(2)} ${(H - padBottom).toFixed(2)} Z`
        : "";
    return { ...s, color, points, linePath, areaPath };
  });

  return (
    <div className="relative w-full select-none pt-2" onMouseLeave={() => setHoveredIdx(null)}>
      {/* Container SVG */}
      <div className="relative w-full overflow-visible" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {seriesData.map((s, si) => (
              <linearGradient
                key={si}
                id={`line-grad-${si}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines ngang */}
          {[0, 0.33, 0.66, 1].map((frac, i) => {
            const y = padTop + graphHeight * frac;
            return (
              <line
                key={i}
                x1={padLeft}
                x2={W - padRight}
                y1={y}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* Vùng gradient phủ dưới đường */}
          {seriesData.map((s, si) => (
            <path key={`area-${si}`} d={s.areaPath} fill={`url(#line-grad-${si})`} />
          ))}

          {/* Đường cong Bézier mượt */}
          {seriesData.map((s, si) => (
            <path
              key={`line-${si}`}
              d={s.linePath}
              fill="none"
              stroke={s.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Đường chỉ dẫn thẳng đứng khi hover */}
          {hoveredIdx !== null && (
            <line
              x1={padLeft + (hoveredIdx * graphWidth) / Math.max(pointCount - 1, 1)}
              x2={padLeft + (hoveredIdx * graphWidth) / Math.max(pointCount - 1, 1)}
              y1={padTop - 10}
              y2={H - padBottom}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Các điểm nút (Circle nodes) */}
          {seriesData.map((s, si) =>
            s.points.map((pt, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <g key={`pt-${si}-${i}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="white"
                    stroke={s.color}
                    strokeWidth={isHovered ? 3.5 : 2.5}
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-150 cursor-pointer"
                  />
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={9}
                      fill={s.color}
                      fillOpacity={0.2}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Cột tương tác hover tệp vùng hitboxes */}
        <div className="absolute inset-0 flex">
          {labels.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}
        </div>

        {/* Hover Tooltip Popup floating */}
        {hoveredIdx !== null && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 bg-gray-900/90 backdrop-blur-md text-white text-xs rounded-xl px-3.5 py-2 shadow-xl -translate-x-1/2 -translate-y-full mb-3 whitespace-nowrap"
            style={{
              left: `${((padLeft + (hoveredIdx * graphWidth) / Math.max(pointCount - 1, 1)) / W) * 100}%`,
              top: `${
                ((Math.min(...seriesData.map((s) => s.points[hoveredIdx].y)) - 5) / H) * 100
              }%`,
            }}
          >
            <div className="font-bold text-gray-200 border-b border-gray-700/60 pb-1 mb-1 flex items-center justify-between gap-4">
              <span>{labels[hoveredIdx]}</span>
            </div>
            <div className="flex flex-col gap-1">
              {seriesData.map((s, si) => {
                const val = s.values[hoveredIdx];
                const formatted =
                  val > 1000 ? formatVND(val) : `${val.toLocaleString("vi-VN")} triệu VNĐ`;
                return (
                  <div key={si} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-gray-300 text-[11px]">{s.label}:</span>
                    <span className="font-semibold text-white ml-auto">{formatted}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* X Axis Labels — Căn lề chính xác 100% theo vị trí điểm nút SVG */}
      <div className="relative w-full h-6 mt-2">
        {labels.map((l, i) => {
          const xPercent =
            ((padLeft + (i * graphWidth) / Math.max(pointCount - 1, 1)) / W) * 100;
          return (
            <div
              key={i}
              className={cn(
                "absolute top-0 text-xs transition-colors cursor-pointer whitespace-nowrap",
                i === 0
                  ? "left-0 translate-x-0 text-left"
                  : i === pointCount - 1
                  ? "right-0 translate-x-0 text-right"
                  : "-translate-x-1/2 text-center",
                hoveredIdx === i ? "text-primary font-bold" : "text-gray-500 font-medium"
              )}
              style={
                i === 0
                  ? { left: `${(padLeft / W) * 100}%` }
                  : i === pointCount - 1
                  ? { left: `${((W - padRight) / W) * 100}%`, transform: "translateX(-100%)" }
                  : { left: `${xPercent}%` }
              }
              onMouseEnter={() => setHoveredIdx(i)}
            >
              {l}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Donut chart sang trọng với viền mượt & tooltip phần trăm */
export function DonutChart({
  data,
  size = 180,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 40;
  const C = 2 * Math.PI * r;

  // Tính trước độ dài (dash) và độ lệch (offset) của từng phân đoạn
  const segments = data.map((d, i) => {
    const dash = (d.value / total) * C;
    const offset = data.slice(0, i).reduce((sum, x) => sum + (x.value / total) * C, 0);
    return { ...d, dash, offset };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 select-none" onMouseLeave={() => setHoveredIdx(null)}>
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
          {segments.map((d, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={isHovered ? 15 : 12}
                strokeDasharray={`${d.dash} ${C - d.dash}`}
                strokeDashoffset={-d.offset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                style={{
                  opacity: hoveredIdx !== null && !isHovered ? 0.4 : 1,
                }}
              />
            );
          })}
          <text x="50" y="47" textAnchor="middle" className="fill-gray-900 font-bold" fontSize="13">
            {hoveredIdx !== null ? data[hoveredIdx].value : total}
          </text>
          <text x="50" y="60" textAnchor="middle" className="fill-gray-400 font-medium" fontSize="5.5">
            {hoveredIdx !== null ? data[hoveredIdx].label : "Tổng cộng"}
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        {data.map((d, i) => {
          const isHovered = hoveredIdx === i;
          const pct = Math.round((d.value / total) * 100);
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between text-sm px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                isHovered ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
              )}
              onMouseEnter={() => setHoveredIdx(i)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-gray-700">{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-normal">({d.value})</span>
                <span className="font-bold text-gray-900">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
