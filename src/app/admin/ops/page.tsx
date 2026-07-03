"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBrain, IconSparkles } from "@tabler/icons-react";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { FeatureGate } from "@/components/admin/FeatureGate";
import type { OpsInsight } from "@/lib/types";
import { fmtN } from "@/lib/utils";

type Analytics = {
  ordersTotal: number;
  deliveredCount: number;
  deliveredRevenue: number;
  fleetUtilizationPct: number;
  onTimeDeliveryPct: number;
  fuelSpendMonth: number;
  maintenanceCostMonth: number;
};

export default function OpsPage() {
  return (
    <FeatureGate feature="ai_ops">
      <OpsPageInner />
    </FeatureGate>
  );
}

function OpsPageInner() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<OpsInsight[]>([]);

  const load = useCallback(async () => {
    const [aRes, iRes] = await Promise.all([
      fetch("/api/ops/analytics", { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/ops/insights", { cache: "no-store", credentials: "same-origin" }),
    ]);
    if (aRes.ok) setAnalytics((await aRes.json()) as Analytics);
    if (iRes.ok) setInsights((await iRes.json()) as OpsInsight[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refreshInsights = async () => {
    await fetch("/api/ops/insights", { method: "POST" });
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fleet-gray-900">AI operations</h1>
          <p className="text-sm text-fleet-gray-500">Fleet KPIs, dispatch intelligence, predictive alerts</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => void refreshInsights()}>
          <IconSparkles size={16} /> Refresh insights
        </button>
      </div>

      {analytics && (
        <MetricsGrid>
          <MetricCard accent="teal" icon={IconBrain} label="Fleet utilization" value={`${analytics.fleetUtilizationPct}%`} sub="Active assignments / fleet" />
          <MetricCard accent="navy" icon={IconBrain} label="On-time delivery" value={`${analytics.onTimeDeliveryPct}%`} sub="Completed vs due" />
          <MetricCard accent="amber" icon={IconBrain} label="Delivered revenue" value={fmtN(analytics.deliveredRevenue)} sub={`${analytics.deliveredCount} orders`} />
          <MetricCard accent="red" icon={IconBrain} label="Fuel spend (month)" value={fmtN(analytics.fuelSpendMonth)} sub={`Maint: ${fmtN(analytics.maintenanceCostMonth)}`} />
        </MetricsGrid>
      )}

      <div className="rounded-fleet border border-fleet-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">AI insights</h2>
        {insights.length === 0 && <p className="text-sm text-fleet-gray-400">No insights — click Refresh to analyze fleet data.</p>}
        <ul className="space-y-3">
          {insights.map((i) => (
            <li key={i.id} className="rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 px-3 py-2 text-sm">
              <p className="font-medium text-fleet-gray-800">{i.title}</p>
              <p className="text-fleet-gray-600">{i.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
