"use client";

import Link from "next/link";

export function WorkflowPageHeader({
  title,
  subtitle,
  parentHref,
  parentLabel,
}: {
  title: string;
  subtitle: string;
  parentHref: string;
  parentLabel: string;
}) {
  return (
    <div className="mb-4 min-w-0">
      <p className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fleet-gray-400">
        <Link href={parentHref} className="font-medium text-navy hover:underline">
          {parentLabel}
        </Link>
        <span aria-hidden>/</span>
        <span className="min-w-0 break-words">{title}</span>
      </p>
      <h2 className="text-[15px] font-semibold leading-snug text-fleet-gray-800">{title}</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-fleet-gray-400">{subtitle}</p>
    </div>
  );
}
