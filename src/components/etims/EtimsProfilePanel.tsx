"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { BillingPartyForm } from "@/components/billing/BillingPartyForm";
import { Badge } from "@/components/ui/Badge";
import type { EtimsFilingProfile } from "@/lib/etims-types";
import { DEFAULT_BILLING_PROFILE } from "@/lib/invoice-meta";
import type { BillingProfile } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { saveErrorMessage } from "@/lib/api-errors";
import { useBillingProfile } from "@/hooks/useBillingProfile";

export function EtimsProfilePanel() {
  const { toast } = useToast();
  const { profile, loading: billingLoading, save } = useBillingProfile();
  const [filing, setFiling] = useState<EtimsFilingProfile | null>(null);
  const [form, setForm] = useState<BillingProfile>(DEFAULT_BILLING_PROFILE);

  useEffect(() => {
    fetch("/api/etims/profile", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: EtimsFilingProfile | null) => setFiling(p))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      await save(form);
      toast("Profile saved");
    } catch (error) {
      toast(saveErrorMessage(error));
    }
  };

  if (filing && !filing.enabled) {
    return (
      <div className="card max-w-xl">
        <p className="text-sm text-fleet-gray-500">KRA eTIMS is not configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={filing?.connection?.connected ? "approved" : "pending"}>
            {filing?.connection?.connected ? "Digitax connected" : "Digitax pending"}
          </Badge>
          {filing?.connection?.taxPin && (
            <span className="font-mono text-xs text-fleet-gray-500">KRA PIN {filing.connection.taxPin}</span>
          )}
        </div>
      </div>

      {billingLoading ? (
        <p className="text-sm text-fleet-gray-400">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <BillingPartyForm
            title="Company details (KRA eTIMS)"
            party={form.supplier}
            onChange={(supplier) => setForm((f) => ({ ...f, supplier }))}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-accent">
              <IconDeviceFloppy size={16} /> Save profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
