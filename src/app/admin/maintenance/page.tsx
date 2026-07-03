"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { IconPlus, IconTool } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/Modal";
import { FeatureGate } from "@/components/admin/FeatureGate";
import type { Vehicle } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";

type Schedule = { id: string; plate: string; serviceType: string; nextDueAt?: string; service_type?: string; next_due_at?: string };
type WorkOrder = { id: string; plate: string; title: string; status: string; totalCost?: number; total_cost?: number };

export default function MaintenancePage() {
  return (
    <FeatureGate feature="maintenance">
      <MaintenancePageInner />
    </FeatureGate>
  );
}

function MaintenancePageInner() {
  const { toast } = useToast();
  const { items: vehicles } = useCrud<Vehicle>("vehicles");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [plate, setPlate] = useState("");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/maintenance", { cache: "no-store", credentials: "same-origin" });
    if (res.ok) {
      const json = await res.json();
      setSchedules(json.schedules ?? []);
      setWorkOrders(json.workOrders ?? []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addWorkOrder = async (e: FormEvent) => {
    e.preventDefault();
    const apiRes = await fetch("/api/maintenance/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ plate, title }),
    });
    if (apiRes.ok) {
      toast("Work order opened");
      setTitle("");
      void load();
    } else {
      toast("Failed to create work order", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-fleet-gray-900">Fleet maintenance</h1>
        <p className="text-sm text-fleet-gray-500">Service schedules and garage work orders</p>
      </div>

      <form onSubmit={addWorkOrder} className="grid gap-3 rounded-fleet border border-fleet-gray-200 bg-white p-4 sm:grid-cols-3">
        <FormField label="Vehicle plate">
          <select className="input" value={plate} onChange={(e) => setPlate(e.target.value)} required>
            <option value="">Select…</option>
            {vehicles.map((v) => <option key={v.id} value={v.plate}>{v.plate}</option>)}
          </select>
        </FormField>
        <FormField label="Work order title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Oil change" required />
        </FormField>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full"><IconPlus size={16} /> Open work order</button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-fleet border border-fleet-gray-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><IconTool size={16} /> Schedules</h2>
          {schedules.length === 0 && <p className="text-sm text-fleet-gray-400">No schedules yet</p>}
          <ul className="space-y-2 text-sm">
            {schedules.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-fleet-gray-100 py-2">
                <span>{s.plate} · {(s.serviceType ?? s.service_type)}</span>
                <span className="text-fleet-gray-500">{s.nextDueAt ?? s.next_due_at ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-fleet border border-fleet-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Work orders</h2>
          {workOrders.length === 0 && <p className="text-sm text-fleet-gray-400">No work orders</p>}
          <ul className="space-y-2 text-sm">
            {workOrders.map((w) => (
              <li key={w.id} className="flex items-center justify-between border-b border-fleet-gray-100 py-2">
                <span>{w.plate} — {w.title}</span>
                <Badge variant={w.status === "closed" ? "approved" : "pending"}>{w.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
