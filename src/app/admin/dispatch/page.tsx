"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { IconRefresh, IconRoute } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/Modal";
import { FeatureGate } from "@/components/admin/FeatureGate";
import type { DispatchAssignment, TransportOrder, Driver, Vehicle } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";

type Dashboard = {
  activeAssignments: DispatchAssignment[];
  assignmentsToday: number;
  openOrders: TransportOrder[];
};

export default function DispatchPage() {
  return (
    <FeatureGate feature="dispatch">
      <DispatchPageInner />
    </FeatureGate>
  );
}

function DispatchPageInner() {
  const { toast } = useToast();
  const { items: drivers } = useCrud<Driver>("drivers");
  const { items: vehicles } = useCrud<Vehicle>("vehicles");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dispatch/dashboard", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) setData((await res.json()) as Dashboard);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const assign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignOrderId || !driverId || !vehicleId) return;
    const res = await fetch("/api/dispatch/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderId: assignOrderId, driverId, vehicleId }),
    });
    if (!res.ok) {
      toast("Assign failed", "error");
      return;
    }
    toast("Driver assigned");
    setAssignOrderId("");
    void load();
  };

  const advance = async (id: string, status: string) => {
    await fetch(`/api/dispatch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status }),
    });
    void load();
  };

  if (loading && !data) return <p className="py-12 text-center text-sm text-fleet-gray-400">Loading dispatch board…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fleet-gray-900">Dispatch center</h1>
          <p className="text-sm text-fleet-gray-500">{data?.assignmentsToday ?? 0} assignments today</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void load()}><IconRefresh size={16} /> Refresh</button>
      </div>

      <form onSubmit={assign} className="grid gap-4 rounded-fleet border border-fleet-gray-200 bg-white p-4 sm:grid-cols-4">
        <FormField label="Open order">
          <select className="input" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)}>
            <option value="">Select order…</option>
            {(data?.openOrders ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.orderNo} — {o.customerName}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Driver">
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select driver…</option>
            {drivers.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </FormField>
        <FormField label="Vehicle">
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.filter((v) => v.status === "active").map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
        </FormField>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full"><IconRoute size={16} /> Assign</button>
        </div>
      </form>

      <div className="table-wrap rounded-fleet border border-fleet-gray-200 bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Driver</th>
              <th>Plate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.activeAssignments ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-fleet-gray-400">No active assignments</td></tr>
            )}
            {(data?.activeAssignments ?? []).map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-sm">{a.orderNo ?? a.orderId}</td>
                <td>{a.driverName}</td>
                <td>{a.plate}</td>
                <td><Badge variant="pending">{a.status}</Badge></td>
                <td className="space-x-1">
                  {a.status === "assigned" && <button type="button" className="btn-xs" onClick={() => void advance(a.id, "en_route")}>Start</button>}
                  {a.status === "en_route" && <button type="button" className="btn-xs" onClick={() => void advance(a.id, "in_transit")}>In transit</button>}
                  {a.status === "in_transit" && <button type="button" className="btn-xs" onClick={() => void advance(a.id, "completed")}>Complete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
