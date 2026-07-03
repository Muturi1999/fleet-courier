"use client";

import { FormEvent, useState } from "react";
import { IconCheck, IconTruck } from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";

type Trip = {
  id: string;
  orderNo?: string;
  order_no?: string;
  customerName?: string;
  customer_name?: string;
  pickupAddress?: string;
  pickup_address?: string;
  deliveryAddress?: string;
  delivery_address?: string;
  status: string;
};

export default function DriverPortalPage() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/driver-portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-slug": user?.tenantSlug ?? "horizon-logistics-ltd" },
      body: JSON.stringify({ phone, pin }),
    });
    if (!res.ok) return;
    const json = await res.json();
    setDriverId(json.driverId);
    setLoggedIn(true);
    void loadTrips(json.driverId);
  };

  const loadTrips = async (id: string) => {
    const res = await fetch(`/api/driver-portal/trips?driverId=${encodeURIComponent(id)}`, { credentials: "same-origin" });
    if (res.ok) setTrips((await res.json()) as Trip[]);
  };

  const complete = async (tripId: string) => {
    await fetch(`/api/driver-portal/trips/${tripId}?driverId=${encodeURIComponent(driverId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "completed", podSignature: "Driver signed", podNotes: "Delivered via driver portal" }),
    });
    void loadTrips(driverId);
  };

  if (!loggedIn) {
    return (
      <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-4">
        <div className="mb-6 text-center">
          <IconTruck size={32} className="mx-auto text-teal" />
          <h1 className="mt-2 text-xl font-semibold">Driver portal</h1>
          <p className="text-sm text-fleet-gray-500">Phone + PIN from your fleet admin</p>
        </div>
        <form onSubmit={login} className="space-y-4 rounded-fleet border border-fleet-gray-200 bg-white p-6">
          <label className="block text-sm">
            Phone
            <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-sm">
            PIN
            <input type="password" className="input mt-1" value={pin} onChange={(e) => setPin(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <h1 className="text-lg font-semibold">My trips</h1>
      {trips.length === 0 && <p className="text-sm text-fleet-gray-400">No active trips assigned.</p>}
      {trips.map((t) => (
        <div key={t.id} className="rounded-fleet border border-fleet-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">{t.orderNo ?? t.order_no}</span>
            <Badge variant="pending">{t.status}</Badge>
          </div>
          <p className="mt-2 text-sm font-medium">{t.customerName ?? t.customer_name}</p>
          <p className="text-xs text-fleet-gray-500">{t.pickupAddress ?? t.pickup_address}</p>
          <p className="text-xs text-fleet-gray-500">→ {t.deliveryAddress ?? t.delivery_address}</p>
          {t.status !== "completed" && (
            <button type="button" className="btn-primary mt-3 w-full" onClick={() => void complete(t.id)}>
              <IconCheck size={16} /> Mark delivered (POD)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
