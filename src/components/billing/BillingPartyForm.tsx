"use client";

import { FormField } from "@/components/ui/Modal";
import type { BillingParty } from "@/lib/types";

export function BillingPartyForm({
  title,
  party,
  onChange,
}: {
  title: string;
  party: BillingParty;
  onChange: (p: BillingParty) => void;
}) {
  const set = (patch: Partial<BillingParty>) => onChange({ ...party, ...patch });

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Company name *">
          <input className="field-input" required value={party.name} onChange={(e) => set({ name: e.target.value })} />
        </FormField>
        <FormField label="Legal name">
          <input className="field-input" value={party.legalName ?? ""} onChange={(e) => set({ legalName: e.target.value })} />
        </FormField>
        <FormField label="KRA PIN *" className="sm:col-span-2">
          <input
            className="field-input font-mono uppercase"
            required
            value={party.pin}
            onChange={(e) => set({ pin: e.target.value.toUpperCase() })}
            placeholder="P051987654G"
          />
        </FormField>
        <FormField label="VAT number">
          <input className="field-input font-mono" value={party.vatNo ?? ""} onChange={(e) => set({ vatNo: e.target.value })} />
        </FormField>
        <FormField label="Contract ref">
          <input className="field-input" value={party.contractRef ?? ""} onChange={(e) => set({ contractRef: e.target.value })} />
        </FormField>
        <FormField label="Address" className="sm:col-span-2">
          <input className="field-input" value={party.address} onChange={(e) => set({ address: e.target.value })} />
        </FormField>
        <FormField label="City">
          <input className="field-input" value={party.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </FormField>
        <FormField label="Phone">
          <input className="field-input" value={party.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
        </FormField>
        <FormField label="Contact person">
          <input className="field-input" value={party.contact ?? ""} onChange={(e) => set({ contact: e.target.value })} />
        </FormField>
        <FormField label="Email">
          <input type="email" className="field-input" value={party.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
        </FormField>
      </div>
    </div>
  );
}
