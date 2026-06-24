const variants = {
  paid: "bg-[#DCFCE7] text-[#15803D] before:bg-[#15803D]",
  approved: "bg-teal-light text-teal before:bg-teal",
  sent: "bg-fleet-blue-light text-[#185FA5] before:bg-[#185FA5]",
  pending: "bg-accent-light text-accent-dark before:bg-accent-dark",
  draft: "bg-fleet-gray-100 text-fleet-gray-400 before:bg-fleet-gray-400",
  active: "bg-teal-light text-teal",
  inactive: "bg-fleet-gray-100 text-fleet-gray-400",
  suspended: "bg-accent-light text-accent-dark",
  rejected: "bg-[#FEE2E2] text-[#991B1B] before:bg-[#991B1B]",
  flag: "bg-[#FEE2E2] text-[#991B1B] before:bg-[#991B1B]",
  morning: "bg-[#FEF9C3] text-[#854D0E] before:bg-[#854D0E]",
  afternoon: "bg-fleet-blue-light text-[#185FA5] before:bg-[#185FA5]",
  both: "bg-[#F3E8FF] text-[#7E22CE] before:bg-[#7E22CE]",
} as const;

type BadgeVariant = keyof typeof variants;

const dotted: BadgeVariant[] = ["paid", "approved", "sent", "pending", "draft", "rejected", "flag", "morning", "afternoon", "both"];

export function Badge({
  variant = "draft",
  children,
  dot = true,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        dot && dotted.includes(variant) && "before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-['']",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function clsToBadgeVariant(cls: string): BadgeVariant {
  const c = cls.trim().toUpperCase();
  if (c === "15T") return "sent";
  if (c === "CANTER") return "pending";
  if (c === "VAN") return "approved";
  return "draft";
}

function clsx(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(" ");
}
