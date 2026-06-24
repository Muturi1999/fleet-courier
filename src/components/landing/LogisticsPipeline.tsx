import { LOGISTICS_PIPELINE } from "@/lib/platform-brand";

type Variant = "hero" | "onboarding";

export function LogisticsPipeline({ variant = "hero" }: { variant?: Variant }) {
  const isHero = variant === "hero";

  return (
    <div
      className={
        isHero
          ? "mt-3 border-t border-white/10 pt-3 xs:mt-4 xs:pt-4"
          : "rounded-fleet-sm border border-fleet-gray-200 bg-fleet-gray-50 p-3 xs:p-4"
      }
    >
      <p
        className={
          isHero
            ? "mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45 xs:mb-2.5 xs:text-[11px]"
            : "mb-2 text-[10px] font-semibold uppercase tracking-widest text-fleet-gray-400 xs:text-[11px]"
        }
      >
        End-to-end fleet logistics
      </p>
      <ol className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] xs:gap-2 [&::-webkit-scrollbar]:hidden">
        {LOGISTICS_PIPELINE.map((stage, i) => (
          <li
            key={stage.id}
            className={
              isHero
                ? "flex min-w-[88px] shrink-0 flex-col rounded-fleet-sm border border-white/10 bg-white/[0.05] px-2 py-2 xs:min-w-[96px] xs:px-2.5 xs:py-2.5"
                : "flex min-w-[88px] shrink-0 flex-col rounded-fleet-sm border border-fleet-gray-200 bg-white px-2 py-2 xs:min-w-[96px] xs:px-2.5 xs:py-2.5"
            }
          >
            <span
              className={
                isHero
                  ? "text-[9px] font-bold uppercase tracking-wide text-accent xs:text-[10px]"
                  : "text-[9px] font-bold uppercase tracking-wide text-accent-dark xs:text-[10px]"
              }
            >
              {String(i + 1).padStart(2, "0")} · {stage.label}
            </span>
            <span
              className={
                isHero
                  ? "mt-0.5 text-[10px] leading-snug text-white/55 xs:text-[11px]"
                  : "mt-0.5 text-[10px] leading-snug text-fleet-gray-500 xs:text-[11px]"
              }
            >
              {stage.detail}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
