"use client";

import { useEffect, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconCheck, IconEdit, IconFileText } from "@tabler/icons-react";
import { BillingPartyForm } from "@/components/billing/BillingPartyForm";
import { FormField } from "@/components/ui/Modal";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { calcBilling } from "@/lib/billing";
import { DEFAULT_BILLING_PROFILE } from "@/lib/invoice-meta";
import type { BillingProfile, Invoice, InvoiceStatus } from "@/lib/types";
import { useToast } from "@/context/ToastContext";

const STEPS = [
  { id: 1, label: "Invoice details", short: "Details" },
  { id: 2, label: "Billing settings", short: "Billing" },
  { id: 3, label: "Preview & confirm", short: "Preview" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function StepTiles({ step, maxReached, onGo }: { step: StepId; maxReached: StepId; onGo: (s: StepId) => void }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {STEPS.map((s) => {
        const active = step === s.id;
        const done = s.id < step;
        const reachable = s.id <= maxReached;
        return (
          <button
            key={s.id}
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onGo(s.id)}
            className={`flex items-center gap-3 rounded-fleet-md border px-4 py-3 text-left transition-colors ${
              active
                ? "border-navy bg-navy text-white"
                : done
                  ? "border-teal/30 bg-teal-light text-navy"
                  : reachable
                    ? "border-fleet-gray-100 bg-white text-fleet-gray-700 hover:border-fleet-gray-200"
                    : "cursor-not-allowed border-fleet-gray-100 bg-fleet-gray-50 text-fleet-gray-400"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                active ? "bg-accent text-navy" : done ? "bg-teal text-white" : "bg-fleet-gray-100 text-fleet-gray-500"
              }`}
            >
              {done ? <IconCheck size={16} /> : s.id}
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Step {s.id}</span>
              <span className="block text-sm font-medium">{s.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  nextDisabled,
  showBack = true,
}: {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-fleet-gray-100 pt-4">
      {showBack && onBack ? (
        <button type="button" className="btn-secondary" onClick={onBack}>
          <IconArrowLeft size={16} /> {backLabel}
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button type="button" className="btn-accent" disabled={nextDisabled} onClick={onNext}>
          {nextLabel} <IconArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

export function InvoiceCreateWizard({
  form,
  setForm,
  dayRate,
  setDayRate,
  profile,
  profileLoading,
  onSaveProfile,
  onCancel,
  onSave,
  saving,
}: {
  form: Omit<Invoice, "id">;
  setForm: React.Dispatch<React.SetStateAction<Omit<Invoice, "id">>>;
  dayRate: number;
  setDayRate: (n: number) => void;
  profile: BillingProfile | null;
  profileLoading: boolean;
  onSaveProfile: (p: BillingProfile) => Promise<unknown>;
  onCancel: () => void;
  onSave: (status: InvoiceStatus) => Promise<void>;
  saving?: boolean;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<StepId>(1);
  const [maxReached, setMaxReached] = useState<StepId>(1);
  const [billingForm, setBillingForm] = useState<BillingProfile>(DEFAULT_BILLING_PROFILE);

  useEffect(() => {
    if (profile) setBillingForm(profile);
  }, [profile]);

  const goTo = (next: StepId) => {
    setStep(next);
    setMaxReached((m) => (next > m ? next : m) as StepId);
  };

  const setRateDays = (rate: number, days: number) => {
    const b = calcBilling(rate, days);
    setDayRate(rate);
    setForm((f) => ({ ...f, days, net: b.cost, vat: b.vat, total: b.total }));
  };

  const validateStep1 = () => {
    if (!form.plate.trim()) {
      toast("Vehicle plate is required");
      return false;
    }
    if (!form.route.trim()) {
      toast("Route / particulars is required");
      return false;
    }
    if (form.days < 1) {
      toast("Days must be at least 1");
      return false;
    }
    if (form.net <= 0) {
      toast("Net amount must be greater than zero");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!billingForm.supplier.name.trim() || !billingForm.supplier.pin.trim()) {
      toast("Supplier company name and KRA PIN are required");
      return false;
    }
    if (!billingForm.client.name.trim() || !billingForm.client.pin.trim()) {
      toast("Client company name and KRA PIN are required");
      return false;
    }
    return true;
  };

  const handleStep1Next = () => {
    if (!validateStep1()) return;
    goTo(2);
  };

  const handleStep2Next = async () => {
    if (!validateStep2()) return;
    try {
      await onSaveProfile(billingForm);
      goTo(3);
    } catch {
      toast("Could not save billing settings");
    }
  };

  const previewInvoice: Invoice = { ...form, id: "preview", status: "draft" };

  return (
    <div className="max-w-4xl">
      <StepTiles step={step} maxReached={maxReached} onGo={setStep} />

      {step === 1 && (
        <div className="card grid grid-cols-2 gap-3">
          <p className="col-span-2 text-sm text-fleet-gray-500">
            Enter trip and billing line details. Status is set on the final preview step.
          </p>
          <FormField label="Invoice No.">
            <input className="field-input bg-fleet-gray-50 font-mono" readOnly value={form.invoiceNo} />
          </FormField>
          <FormField label="Vehicle plate *">
            <input
              className="field-input"
              required
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            />
          </FormField>
          <FormField label="Vehicle class *">
            <select className="field-input" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
              <option>7T</option>
              <option>15T</option>
              <option>Canter</option>
              <option>Van</option>
            </select>
          </FormField>
          <FormField label="Service date">
            <input
              type="date"
              className="field-input"
              value={form.serviceDate ?? ""}
              onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
            />
          </FormField>
          <FormField label="Billing period">
            <input
              className="field-input"
              placeholder="e.g. Mar 2026"
              value={form.period ?? ""}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
          </FormField>
          <FormField label="D/Note No.">
            <input
              className="field-input"
              value={form.deliveryNoteNo ?? ""}
              onChange={(e) => setForm({ ...form, deliveryNoteNo: e.target.value })}
            />
          </FormField>
          <FormField label="Particulars (route / collection)" className="col-span-2">
            <input className="field-input" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
          </FormField>
          <FormField label="Daily rate (KES) *">
            <input
              type="number"
              min={1}
              className="field-input"
              value={dayRate}
              onChange={(e) => setRateDays(Number(e.target.value), form.days)}
            />
          </FormField>
          <FormField label="Days *">
            <input
              type="number"
              min={1}
              className="field-input"
              value={form.days}
              onChange={(e) => setRateDays(dayRate, Number(e.target.value))}
            />
          </FormField>
          <FormField label="Net (KES) — excl. VAT">
            <input
              type="number"
              className="field-input"
              value={form.net}
              onChange={(e) => {
                const net = Number(e.target.value);
                const vat = Math.round(net * 0.16);
                setForm({ ...form, net, vat, total: net + vat });
                setDayRate(form.days > 0 ? Math.round(net / form.days) : dayRate);
              }}
            />
          </FormField>
          <div className="col-span-2 rounded-fleet-md bg-navy p-3 text-xs text-white/80">
            <div className="flex justify-between">
              <span>Net (excl. VAT)</span>
              <span className="font-mono">KES {form.net.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT @ 16%</span>
              <span className="font-mono">KES {form.vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-accent">
              <span>Total incl. VAT</span>
              <span className="font-mono">KES {form.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="col-span-2 flex flex-wrap justify-between gap-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn-accent" onClick={handleStep1Next}>
              Next step <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-fleet-gray-500">
            Confirm supplier and client KRA PIN, VAT numbers, and addresses. These appear on the printed invoice.
          </p>
          {profileLoading ? (
            <p className="text-sm text-fleet-gray-400">Loading billing profile…</p>
          ) : (
            <>
              <BillingPartyForm
                title="Supplier (your company)"
                party={billingForm.supplier}
                onChange={(supplier) => setBillingForm((f) => ({ ...f, supplier }))}
              />
              <BillingPartyForm
                title="Client (bill to)"
                party={billingForm.client}
                onChange={(client) => setBillingForm((f) => ({ ...f, client }))}
              />
            </>
          )}
          <WizardNav
            onBack={() => setStep(1)}
            onNext={handleStep2Next}
            nextLabel="Next step"
            nextDisabled={profileLoading || saving}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-fleet-md border border-teal/30 bg-teal-light px-4 py-3 text-sm text-navy">
            <IconFileText size={16} className="mr-1 inline" />
            Review the invoice below. If every detail is correct, save as draft or create and send to G4S.
          </div>
          <InvoiceDocument invoice={previewInvoice} profile={billingForm} compact />
          <div className="flex flex-wrap gap-2 border-t border-fleet-gray-100 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              <IconArrowLeft size={16} /> Back
            </button>
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              <IconEdit size={16} /> Edit details
            </button>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => onSave("draft")}
              >
                Save as draft
              </button>
              <button
                type="button"
                className="btn-accent"
                disabled={saving}
                onClick={() => onSave("sent")}
              >
                {saving ? "Saving…" : "Create invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
