"use client";

import { FormEvent, useEffect, useState } from "react";
import { IconBuilding, IconDeviceFloppy } from "@tabler/icons-react";
import { BillingPartyForm } from "@/components/billing/BillingPartyForm";
import { DEFAULT_BILLING_PROFILE } from "@/lib/invoice-meta";
import type { BillingProfile } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { useBillingProfile } from "@/hooks/useBillingProfile";

export default function BillingSettingsPage() {
  const { toast } = useToast();
  const { profile, loading, save } = useBillingProfile();
  const [form, setForm] = useState<BillingProfile>(DEFAULT_BILLING_PROFILE);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      await save(form);
      toast("Billing profile saved — invoices will use updated client & supplier details");
    } catch {
      toast("Save failed");
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm text-fleet-gray-500">
        <IconBuilding size={16} />
        <span>Company name, KRA PIN and address appear on every invoice and eTIMS submission.</span>
      </div>

      {loading ? (
        <p className="text-sm text-fleet-gray-400">Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <BillingPartyForm
            title="Supplier (your company)"
            party={form.supplier}
            onChange={(supplier) => setForm((f) => ({ ...f, supplier }))}
          />
          <BillingPartyForm
            title="Client (bill to)"
            party={form.client}
            onChange={(client) => setForm((f) => ({ ...f, client }))}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-accent">
              <IconDeviceFloppy size={16} /> Save billing profile
            </button>
          </div>
        </form>
      )}
    </>
  );
}
