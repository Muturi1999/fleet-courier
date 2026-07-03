"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPackage, IconPlus } from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import type { TransportOrder } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";

export default function ClientOrdersPage() {
  const router = useRouter();
  const { featureEnabled, loading } = useTenantCapabilities();

  useEffect(() => {
    if (!loading && !featureEnabled("customer_shipments")) router.replace("/client");
  }, [featureEnabled, loading, router]);

  if (loading || !featureEnabled("customer_shipments")) {
    return <p className="py-12 text-center text-sm text-fleet-gray-400">Loading…</p>;
  }

  return <ClientOrdersPageInner />;
}

function ClientOrdersPageInner() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<TransportOrder[]>([]);
  const [form, setForm] = useState({
    customerName: user?.displayName ?? "",
    customerPhone: "",
    pickupAddress: "",
    deliveryAddress: "",
    cargoDescription: "",
    quotedAmount: 0,
  });

  const load = async () => {
    const res = await fetch("/api/clients/orders", { cache: "no-store", credentials: "same-origin" });
    if (res.ok) setOrders((await res.json()) as TransportOrder[]);
  };

  useEffect(() => { void load(); }, []);

  const book = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/clients/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm((f) => ({ ...f, pickupAddress: "", deliveryAddress: "", cargoDescription: "" }));
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-fleet-gray-900">Shipments</h1>
        <p className="text-sm text-fleet-gray-500">Book and track transport orders</p>
      </div>

      <form onSubmit={book} className="grid gap-3 rounded-fleet border border-fleet-gray-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Pickup<input className="input mt-1" value={form.pickupAddress} onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))} required /></label>
        <label className="text-sm sm:col-span-2">Delivery<input className="input mt-1" value={form.deliveryAddress} onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))} required /></label>
        <label className="text-sm sm:col-span-2">Cargo<textarea className="input mt-1" value={form.cargoDescription} onChange={(e) => setForm((f) => ({ ...f, cargoDescription: e.target.value }))} /></label>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary"><IconPlus size={16} /> Book shipment</button>
        </div>
      </form>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="flex items-start gap-3 rounded-fleet border border-fleet-gray-200 bg-white p-4">
            <IconPackage size={20} className="mt-0.5 text-teal" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{o.orderNo}</span>
                <Badge variant="pending">{o.status}</Badge>
              </div>
              <p className="mt-1 text-sm">{o.pickupAddress} → {o.deliveryAddress}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
