"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCircleCheck, IconCircleX } from "@tabler/icons-react";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  createdAt: string;
  userCount: number;
  partnerCount: number;
  partners: { id: string; slug: string; name: string; active: boolean }[];
};

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);

  useEffect(() => {
    fetch("/api/platform/tenants")
      .then((r) => r.json())
      .then(setTenants)
      .catch(() => setTenants([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fleet-gray-900">Clients & partners</h1>
        <p className="mt-1 text-sm text-fleet-gray-500">
          All fleet operator workspaces and their partner organisations.
        </p>
      </div>

      <div className="overflow-hidden rounded-fleet border border-fleet-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-fleet-gray-50 text-left text-xs uppercase tracking-wider text-fleet-gray-400">
            <tr>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Partners</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-fleet-gray-100">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-fleet-gray-50/50">
                <td className="px-4 py-3 font-medium text-fleet-gray-800">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-fleet-gray-500">/{t.slug}</td>
                <td className="px-4 py-3 text-fleet-gray-600">
                  {t.partners.map((p) => p.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-fleet-gray-600">{t.userCount}</td>
                <td className="px-4 py-3">
                  {t.active ? (
                    <span className="inline-flex items-center gap-1 text-teal">
                      <IconCircleCheck size={14} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-fleet-gray-400">
                      <IconCircleX size={14} /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/platform/tenants/${t.slug}`}
                    className="inline-flex items-center gap-1 text-teal hover:underline"
                  >
                    Details <IconArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
