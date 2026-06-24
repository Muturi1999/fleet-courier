"use client";

import { fmtN, sumBy, toNum } from "@/lib/utils";

export function BarChart({
  data,
  valueKey = "total",
  labelKey = "label",
  highlightLast,
}: {
  data: Record<string, string | number>[];
  valueKey?: string;
  labelKey?: string;
  highlightLast?: boolean;
}) {
  const values = data.map((d) => toNum(d[valueKey]));
  const max = Math.max(...values, 1);

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d, i) => {
        const val = toNum(d[valueKey]);
        const pct = Math.round((val / max) * 100);
        const hi = highlightLast && i === data.length - 1;
        return (
          <div key={String(d[labelKey])}>
            <div className={`mb-1 flex justify-between text-xs ${hi ? "font-semibold" : ""}`}>
              <span>{d[labelKey]}</span>
              <span className="font-mono">KES {fmtN(val)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded bg-fleet-gray-100">
              <div
                className={`h-full rounded transition-all ${hi ? "bg-teal" : i % 2 === 0 ? "bg-navy" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalBars({
  items,
  maxItems = 8,
}: {
  items: { label: string; value: number; sub?: string }[];
  maxItems?: number;
}) {
  const shown = items.slice(0, maxItems);
  const max = Math.max(...shown.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((item, i) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 font-mono font-medium">KES {fmtN(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-fleet-gray-100">
            <div
              className={`h-full rounded ${["bg-navy", "bg-teal", "bg-accent", "bg-fleet-blue"][i % 4]}`}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
          {item.sub && <p className="mt-0.5 text-[10px] text-fleet-gray-400">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  segments,
  size = 120,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = sumBy(segments, (x) => x.value) || 1;
  let offset = 0;
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={14} />
        {segments.map((seg) => {
          const len = (seg.value / total) * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="flex-1">{seg.label}</span>
            <span className="font-mono text-fleet-gray-500">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
