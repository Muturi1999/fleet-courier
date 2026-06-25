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
    <div className="mb-4">
      <p className="mb-1 text-xs text-fleet-gray-400">
        <Link href={parentHref} className="font-medium text-navy hover:underline">
          {parentLabel}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{title}</span>
      </p>
      <h2 className="text-[15px] font-semibold text-fleet-gray-800">{title}</h2>
      <p className="text-xs text-fleet-gray-400">{subtitle}</p>
    </div>
  );
}
