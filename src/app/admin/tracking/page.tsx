"use client";

import { useCallback, useEffect, useState } from "react";
import { IconMapPin, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FeatureGate } from "@/components/admin/FeatureGate";

type LivePos = {
  plate: string;
  latitude: string;
  longitude: string;
  speed_kph?: string;
  recorded_at: string;
};

type Alert = {
  id: string;
  plate: string;
  alert_type: string;
  message: string;
  created_at: string;
};

export default function TrackingPage() {
  return (
    <FeatureGate feature="gps_tracking">
      <TrackingPageInner />
    </FeatureGate>
  );
}

function TrackingPageInner() {
  const [positions, setPositions] = useState<LivePos[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [liveRes, alertRes] = await Promise.all([
        fetch("/api/gps/live", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/gps/alerts", { cache: "no-store", credentials: "same-origin" }),
      ]);
      if (liveRes.ok) setPositions((await liveRes.json()) as LivePos[]);
      if (alertRes.ok) setAlerts((await alertRes.json()) as Alert[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const simulate = async () => {
    await fetch("/api/gps/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 5 }) });
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fleet-gray-900">Live tracking</h1>
          <p className="text-sm text-fleet-gray-500">Fleet positions · Traccar webhook ready</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => void load()}><IconRefresh size={16} /> Refresh</button>
          <button type="button" className="btn-primary" onClick={() => void simulate()}>Simulate fleet</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-fleet-gray-400">Loading map data…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {positions.length === 0 && (
              <p className="text-sm text-fleet-gray-400 sm:col-span-3">No GPS positions — register devices or run simulate.</p>
            )}
            {positions.map((p) => (
              <div key={p.plate} className="rounded-fleet border border-fleet-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 font-medium">
                  <IconMapPin size={16} className="text-teal" /> {p.plate}
                </div>
                <p className="mt-2 font-mono text-xs text-fleet-gray-500">
                  {Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}
                </p>
                <p className="text-xs text-fleet-gray-400">
                  {p.speed_kph ? `${p.speed_kph} km/h · ` : ""}{new Date(p.recorded_at).toLocaleString()}
                </p>
                <a
                  className="mt-2 inline-block text-xs text-teal hover:underline"
                  href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Maps
                </a>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className="rounded-fleet border border-fleet-red/20 bg-fleet-red/5 p-4">
              <h2 className="text-sm font-semibold text-fleet-gray-800">Alerts</h2>
              <ul className="mt-2 space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <Badge variant="rejected">{a.alert_type}</Badge>
                    <span>{a.plate}: {a.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
