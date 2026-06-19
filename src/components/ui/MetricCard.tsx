import { IconProps } from "@tabler/icons-react";

type Accent = "amber" | "teal" | "navy" | "red" | "blue";

const accentMap: Record<Accent, string> = {
  amber: "metric-card-amber",
  teal: "metric-card-teal",
  navy: "metric-card-navy",
  red: "metric-card-red",
  blue: "metric-card-blue",
};

const iconBg: Record<Accent, string> = {
  amber: "bg-accent-light text-accent-dark",
  teal: "bg-teal-light text-teal",
  navy: "bg-[#E8EDF5] text-navy",
  red: "bg-fleet-red-light text-fleet-red",
  blue: "bg-fleet-blue-light text-fleet-blue",
};

export function MetricCard({
  accent,
  icon: Icon,
  label,
  value,
  sub,
}: {
  accent: Accent;
  icon: React.ComponentType<IconProps>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`metric-card min-w-0 ${accentMap[accent]}`}>
      <div className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-fleet-sm sm:right-4 sm:top-4 sm:h-9 sm:w-9 ${iconBg[accent]}`}>
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" stroke={1.75} />
      </div>
      <div className="mb-1.5 pr-8 text-[10px] font-medium uppercase leading-tight tracking-wide text-fleet-gray-400 sm:mb-2 sm:pr-0 sm:text-[11px]">{label}</div>
      <div className="mb-1 text-xl font-semibold leading-none text-fleet-gray-800 sm:mb-1.5 sm:text-[26px]">{value}</div>
      <div className="line-clamp-2 text-[10px] leading-snug text-fleet-gray-400 sm:line-clamp-none sm:text-xs">{sub}</div>
    </div>
  );
}

export function MetricsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-2.5 xs:grid-cols-2 sm:gap-3.5 xl:grid-cols-4">
      {children}
    </div>
  );
}
