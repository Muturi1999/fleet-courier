"use client";

import { fmtN, toNum } from "@/lib/utils";

export function LineChart({
  data,
  valueKey,
  labelKey = "label",
  stroke = "#0D9488",
  fill = "rgba(13, 148, 136, 0.12)",
  height = 200,
  formatValue = (v: number) => fmtN(v),
}: {
  data: Record<string, string | number>[];
  valueKey: string;
  labelKey?: string;
  stroke?: string;
  fill?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-xs text-fleet-gray-400">No trend data for this period</p>;
  }

  const values = data.map((d) => toNum(d[valueKey]));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 100;
  const padX = 2;
  const padY = 8;
  const innerH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = padX + (i / Math.max(values.length - 1, 1)) * (width - padX * 2);
    const y = padY + innerH - ((v - min) / range) * innerH;
    return { x, y, v, label: String(data[i][labelKey] ?? "") };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padX} ${height - padY} L ${points[0]?.x ?? padX} ${height - padY} Z`;

  const tickEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="w-full min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none" role="img">
        <path d={areaPath} fill={fill} stroke="none" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={stroke} />
        ))}
      </svg>
      <div className="mt-2 flex justify-between gap-1 text-[10px] text-fleet-gray-400">
        {points.map((p, i) =>
          i % tickEvery === 0 || i === points.length - 1 ? (
            <span key={p.label} className="truncate">
              {p.label}
            </span>
          ) : (
            <span key={`sp-${i}`} className="flex-1" />
          ),
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-fleet-gray-400">
        <span>Min {formatValue(min)}</span>
        <span>Peak {formatValue(max)}</span>
      </div>
    </div>
  );
}
