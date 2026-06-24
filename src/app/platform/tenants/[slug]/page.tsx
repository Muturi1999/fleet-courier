"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconArrowLeft, IconKey, IconMail, IconRefresh } from "@tabler/icons-react";

type TenantDetail = {
  slug: string;
  name: string;
  active: boolean;
  createdAt: string;
  partners: { id: string; slug: string; name: string; email?: string | null }[];
  users: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    active: boolean;
    partnerName: string | null;
    password: string | null;
  }[];
};

export default function PlatformTenantDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/platform/tenants/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(setTenant)
      .catch(() => setTenant(null));
  };

  useEffect(() => {
    load();
  }, [slug]);

  const resetPassword = async (userId: string, username: string) => {
    setResetting(userId);
    setFlash(null);
    try {
      const res = await fetch(
        `/api/platform/tenants/${encodeURIComponent(slug)}/users/${encodeURIComponent(userId)}/reset-password`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Reset failed");
      setFlash(`New password for ${username}: ${json.password}`);
      load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(null);
    }
  };

  if (!tenant) {
    return <p className="text-fleet-gray-400">Loading workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/platform/tenants" className="inline-flex items-center gap-1 text-sm text-fleet-gray-500 hover:text-navy">
        <IconArrowLeft size={16} /> All clients
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-fleet-gray-900">{tenant.name}</h1>
        <p className="mt-1 font-mono text-sm text-fleet-gray-500">/{tenant.slug}</p>
      </div>

      {flash && (
        <div className="rounded-fleet-sm border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-fleet-gray-700">
          {flash}
        </div>
      )}

      <section className="rounded-fleet border border-fleet-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-fleet-gray-800">Partners</h2>
        <div className="mt-4 space-y-3">
          {tenant.partners.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-fleet-sm bg-fleet-gray-50 px-4 py-3">
              <div>
                <p className="font-medium text-fleet-gray-800">{p.name}</p>
                <p className="text-xs font-mono text-fleet-gray-500">{p.slug}</p>
              </div>
              {p.email && (
                <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-sm text-teal hover:underline">
                  <IconMail size={14} /> {p.email}
                </a>
              )}
            </div>
          ))}
          {tenant.partners.length === 0 && <p className="text-sm text-fleet-gray-400">No partners yet</p>}
        </div>
      </section>

      <section className="rounded-fleet border border-fleet-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-fleet-gray-800">Portal credentials</h2>
        <p className="mt-1 text-sm text-fleet-gray-500">
          Passwords are stored encrypted for support recovery. Reset to generate a new password you can email to the client.
        </p>
        <div className="mt-4 overflow-hidden rounded-fleet-sm border border-fleet-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-fleet-gray-50 text-left text-xs uppercase tracking-wider text-fleet-gray-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Password</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-fleet-gray-100">
              {tenant.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-mono">{u.username}</p>
                    <p className="text-xs text-fleet-gray-400">{u.displayName}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-fleet-gray-600">{u.role}</td>
                  <td className="px-4 py-3 text-fleet-gray-600">{u.partnerName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.password ? (
                      <code className="rounded bg-fleet-gray-100 px-2 py-1 font-mono text-xs">{u.password}</code>
                    ) : (
                      <span className="text-xs text-fleet-gray-400">Not stored — reset to set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-teal hover:underline disabled:opacity-50"
                      disabled={resetting === u.id}
                      onClick={() => resetPassword(u.id, u.username)}
                    >
                      <IconRefresh size={14} />
                      {resetting === u.id ? "Resetting…" : "Reset"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-fleet-gray-400">
          <IconKey size={14} />
          Login URL: https://swiftfleet.africa/login?tenant={tenant.slug}
        </p>
      </section>
    </div>
  );
}
