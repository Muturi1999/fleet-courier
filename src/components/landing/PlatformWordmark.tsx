import { IconTruckDelivery } from "@tabler/icons-react";
import { PLATFORM } from "@/lib/platform-brand";

type Variant = "landing" | "onboarding";

export function PlatformWordmark({ variant = "landing" }: { variant?: Variant }) {
  const isLanding = variant === "landing";

  return (
    <div className="flex min-w-0 items-center gap-2.5 xs:gap-3">
      <div
        className={
          isLanding
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-fleet-sm bg-accent text-navy xs:h-10 xs:w-10"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-fleet-sm bg-accent-light text-accent-dark"
        }
      >
        <IconTruckDelivery size={isLanding ? 20 : 18} className="xs:hidden" />
        <IconTruckDelivery size={isLanding ? 22 : 20} className="hidden xs:block" />
      </div>
      <div className="min-w-0">
        <p
          className={
            isLanding
              ? "truncate text-sm font-semibold text-white"
              : "truncate text-sm font-semibold text-fleet-gray-800"
          }
        >
          {PLATFORM.productName}
        </p>
        <p
          className={
            isLanding
              ? "truncate text-[10px] uppercase tracking-wider text-white/40"
              : "truncate text-[10px] uppercase tracking-wider text-fleet-gray-400"
          }
        >
          {PLATFORM.productLine} · {PLATFORM.companyName}
        </p>
      </div>
    </div>
  );
}
