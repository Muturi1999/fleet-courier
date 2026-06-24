"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconBuilding, IconTrendingUp, IconUsers } from "@tabler/icons-react";

type Stats = {
  tenants: { total: number; active: number; newThisMonth: number; growthRatePct: number };
  partners: number;
  users: number;
};

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/platform/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: "Fleet operators", value: stats?.tenants.active ?? "—", sub: `${stats?.tenants.total ?? 0} total workspaces` },
    { label: "Partners", value: stats?.partners ?? "—", sub: "Isolated portal accounts" },
    { label: "Portal users", value: stats?.users ?? "—", sub: "Admins + partners" },
    {
      label: "Growth this month",
      value: stats ? `${stats.tenants.growthRatePct}%` : "—",
      sub: `${stats?.tenants.newThisMonth ?? 0} new operators`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fleet-gray-900">Platform overview</h1>
        <p className="mt-1 text-sm text-fleet-gray-500">
          Monitor fleet operator growth, manage credentials, and support partner portal access.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-fleet border border-fleet-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-fleet-gray-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-navy">{card.value}</p>
            <p className="mt-1 text-xs text-fleet-gray-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-fleet border border-fleet-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-navy">
            <IconBuilding size={20} />
            <h2 className="font-semibold">Client workspaces</h2>
          </div>
          <p className="mt-2 text-sm text-fleet-gray-500">
            View every fleet operator, their partners, and stored portal credentials for password recovery.
          </p>
          <Link href="/platform/tenants" className="btn-accent mt-4 inline-flex items-center gap-2 text-sm">
            Manage clients <IconArrowRight size={16} />
          </Link>
        </div>
        <div className="rounded-fleet border border-fleet-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-navy">
            <IconTrendingUp size={20} />
            <h2 className="font-semibold">Onboarding funnel</h2>
          </div>
          <p className="mt-2 text-sm text-fleet-gray-500">
            {stats?.tenants.newThisMonth ?? 0} operators joined this month.
            Each workspace gets isolated data and partner-specific portal logins.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-fleet-gray-600">
            <IconUsers size={16} />
            <span>{stats?.partners ?? 0} partner organisations across the platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
