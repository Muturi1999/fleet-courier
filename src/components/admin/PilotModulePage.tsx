"use client";

import Link from "next/link";
import { IconArrowLeft, IconRocket } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";

export function PilotModulePage({
  title,
  phase,
  summary,
  bullets,
}: {
  title: string;
  phase: string;
  summary: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-fleet-gray-500 hover:text-navy"
      >
        <IconArrowLeft size={16} /> Dashboard
      </Link>

      <div className="rounded-fleet border border-accent/30 bg-accent-light/40 p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <IconRocket size={20} className="text-accent-dark" />
          <Badge variant="pending">Operations pilot</Badge>
          <span className="text-xs text-fleet-gray-500">{phase}</span>
        </div>
        <h1 className="text-2xl font-semibold text-fleet-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fleet-gray-600">{summary}</p>
      </div>

      <div className="rounded-fleet border border-fleet-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-fleet-gray-800">Planned for this module</h2>
        <ul className="mt-3 space-y-2 text-sm text-fleet-gray-600">
          {bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-teal">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-fleet-gray-400">
          Testing on workspace <span className="font-mono">horizon-logistics-ltd</span>. RNT/G4S workspaces are unchanged.
        </p>
      </div>
    </div>
  );
}
