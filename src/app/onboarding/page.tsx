"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconLoader2,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react";

type Step = "operator" | "company" | "partner" | "admin" | "review";

type FormState = {
  name: string;
  slug: string;
  contract: string;
  legalName: string;
  address: string;
  city: string;
  pin: string;
  phone: string;
  vatNo: string;
  email: string;
  partnerName: string;
  partnerLegalName: string;
  partnerAddress: string;
  partnerCity: string;
  partnerPin: string;
  partnerEmail: string;
  partnerContact: string;
  adminUsername: string;
  adminPassword: string;
  adminDisplayName: string;
  createPartnerPortal: boolean;
  partnerPassword: string;
};

const INITIAL: FormState = {
  name: "",
  slug: "",
  contract: "",
  legalName: "",
  address: "",
  city: "Nairobi, Kenya",
  pin: "",
  phone: "",
  vatNo: "",
  email: "",
  partnerName: "",
  partnerLegalName: "",
  partnerAddress: "",
  partnerCity: "Nairobi, Kenya",
  partnerPin: "",
  partnerEmail: "",
  partnerContact: "Accounts Payable",
  adminUsername: "admin",
  adminPassword: "",
  adminDisplayName: "",
  createPartnerPortal: true,
  partnerPassword: "",
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("operator");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tenant: { slug: string; name: string };
    admin: { username: string };
    partnerPortal?: { username: string; password: string };
  } | null>(null);

  const steps: { id: Step; label: string }[] = [
    { id: "operator", label: "Fleet operator" },
    { id: "company", label: "Your company" },
    { id: "partner", label: "Partner" },
    { id: "admin", label: "Admin login" },
    { id: "review", label: "Review" },
  ];

  const stepIndex = steps.findIndex((s) => s.id === step);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (slugManual || !form.name.trim()) return;
    set({ slug: slugify(form.name) });
  }, [form.name, slugManual]);

  useEffect(() => {
    if (!form.slug || form.slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setSlugStatus("checking");
      try {
        const res = await fetch(`/api/tenants/slug-available/${encodeURIComponent(form.slug)}`);
        const json = (await res.json()) as { available: boolean };
        setSlugStatus(json.available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.slug]);

  const canNext = useMemo(() => {
    if (step === "operator") {
      return form.name.trim().length >= 2 && form.slug.length >= 3 && slugStatus === "ok";
    }
    if (step === "admin") {
      return form.adminUsername.length >= 3 && form.adminPassword.length >= 8;
    }
    return true;
  }, [step, form, slugStatus]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== "review") return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          contract: form.contract || undefined,
          admin: {
            username: form.adminUsername,
            password: form.adminPassword,
            displayName: form.adminDisplayName || form.name,
          },
          company: {
            legalName: form.legalName || form.name,
            address: form.address,
            city: form.city,
            pin: form.pin,
            phone: form.phone,
            vatNo: form.vatNo,
            email: form.email,
          },
          partner: form.partnerName
            ? {
                name: form.partnerName,
                legalName: form.partnerLegalName || form.partnerName,
                address: form.partnerAddress,
                city: form.partnerCity,
                pin: form.partnerPin,
                email: form.partnerEmail,
                contact: form.partnerContact,
              }
            : undefined,
          createPartnerPortal: form.createPartnerPortal,
          partnerPassword: form.createPartnerPortal ? form.partnerPassword || undefined : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          (json as { message?: string | string[] }).message
            ? Array.isArray(json.message)
              ? json.message.join(", ")
              : json.message
            : (json as { error?: string }).error ?? "Onboarding failed",
        );
        return;
      }
      setResult(json);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="auth-screen-centered">
        <div className="w-full max-w-lg">
          <div className="auth-card text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light text-teal xs:h-14 xs:w-14">
              <IconCheck size={24} className="xs:hidden" />
              <IconCheck size={28} className="hidden xs:block" />
            </div>
            <h1 className="auth-title text-lg font-semibold text-fleet-gray-800 xs:text-xl">
              Fleet operator workspace ready
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-fleet-gray-500">
              <strong>{result.tenant.name}</strong> now has the same admin dashboard as Road Network
              Transporters — configure rates, vehicles, and billing, then invite partners to approve
              on their portal.
            </p>
            <div className="mt-5 rounded-fleet-sm bg-fleet-gray-50 p-3 text-left text-sm xs:mt-6 xs:p-4">
              <p className="break-words text-fleet-gray-600">
                <span className="text-fleet-gray-400">Workspace:</span>{" "}
                <code className="font-mono text-xs xs:text-sm">{result.tenant.slug}</code>
              </p>
              <p className="mt-2 break-words text-fleet-gray-600">
                <span className="text-fleet-gray-400">Fleet operator login:</span>{" "}
                <code className="font-mono text-xs xs:text-sm">{result.admin.username}</code> →{" "}
                <code className="font-mono text-xs xs:text-sm">/admin</code>
              </p>
              {result.partnerPortal && (
                <p className="mt-2 break-words text-fleet-gray-600">
                  <span className="text-fleet-gray-400">Partner portal:</span>{" "}
                  <code className="font-mono text-xs xs:text-sm">{result.partnerPortal.username}</code> /{" "}
                  <code className="font-mono text-xs xs:text-sm">{result.partnerPortal.password}</code> →{" "}
                  <code className="font-mono text-xs xs:text-sm">/client</code>
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-accent mt-5 w-full justify-center xs:mt-6"
              onClick={() => router.push(`/login?tenant=${result.tenant.slug}`)}
            >
              Sign in to your dashboard <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen-body">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col gap-3 xs:mb-8 xs:flex-row xs:items-center xs:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm text-fleet-gray-500 hover:text-navy"
          >
            <IconArrowLeft size={16} /> Back
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-fleet-gray-600">
            <IconTruckDelivery size={20} className="shrink-0 text-accent" />
            <span className="truncate text-sm font-semibold">Fleet Courier</span>
          </div>
        </div>

        <h1 className="auth-title mb-2 text-xl font-semibold text-fleet-gray-800 xs:text-2xl">
          Onboard your fleet operation
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-fleet-gray-500 xs:mb-8">
          You are the <strong>fleet operator</strong> (like Road Network Transporters). You get the admin
          dashboard. Partners you bill — e.g. G4S — use a separate portal to approve invoices and work
          tickets. Each fleet operator has an isolated database.
        </p>

        <div className="mb-6 xs:mb-8">
          <p className="mb-2 text-xs font-medium text-fleet-gray-500">
            Step {stepIndex + 1} of {steps.length}: {steps[stepIndex].label}
          </p>
          <div className="flex gap-1.5 xs:gap-2">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-fleet-gray-200"}`}
                title={s.label}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="auth-card space-y-5">
        {step === "operator" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">
                Fleet operator name
              </label>
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Road Network Transporters"
                required
              />
              <p className="mt-1 text-xs text-fleet-gray-400">
                Your company — you issue invoices and manage the fleet
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Workspace URL</label>
              <div className="flex flex-col gap-1.5 xs:flex-row xs:items-center xs:gap-2">
                <span className="shrink-0 text-sm text-fleet-gray-400">fleet.app/</span>
                <input
                  className="field-input w-full font-mono text-sm xs:flex-1"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                  }}
                  placeholder="road-network-transporters"
                  required
                />
              </div>
              {slugStatus === "checking" && (
                <p className="mt-1 flex items-center gap-1 text-xs text-fleet-gray-400">
                  <IconLoader2 size={12} className="animate-spin" /> Checking…
                </p>
              )}
              {slugStatus === "ok" && <p className="mt-1 text-xs text-teal">Available</p>}
              {slugStatus === "taken" && (
                <p className="mt-1 text-xs text-red-600">Already taken</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">
                Partner contract ref (optional)
              </label>
              <input
                className="field-input"
                value={form.contract}
                onChange={(e) => set({ contract: e.target.value })}
                placeholder="G4S-RNT-2026-001"
              />
            </div>
          </>
        )}

        {step === "company" && (
          <>
            <p className="text-sm text-fleet-gray-500">
              Your billing identity on invoices you issue (supplier / fleet operator details).
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Legal name</label>
              <input
                className="field-input"
                value={form.legalName}
                onChange={(e) => set({ legalName: e.target.value })}
                placeholder={form.name}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">KRA PIN</label>
                <input
                  className="field-input font-mono"
                  value={form.pin}
                  onChange={(e) => set({ pin: e.target.value.toUpperCase() })}
                  placeholder="P051470271Y"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">VAT no.</label>
                <input
                  className="field-input font-mono"
                  value={form.vatNo}
                  onChange={(e) => set({ vatNo: e.target.value })}
                  placeholder="0161681P"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Address</label>
              <input
                className="field-input"
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="P.O. Box 4622-00200, Nairobi"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">City</label>
                <input className="field-input" value={form.city} onChange={(e) => set({ city: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Phone</label>
                <input className="field-input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
            </div>
          </>
        )}

        {step === "partner" && (
          <>
            <p className="text-sm text-fleet-gray-500">
              The organization you bill and send invoices to for approval — e.g.{" "}
              <strong>G4S Courier</strong> for Road Network Transporters. You can add more partners
              later in billing settings.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Partner name</label>
              <input
                className="field-input"
                value={form.partnerName}
                onChange={(e) => set({ partnerName: e.target.value })}
                placeholder="G4S Courier"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Legal name</label>
              <input
                className="field-input"
                value={form.partnerLegalName}
                onChange={(e) => set({ partnerLegalName: e.target.value })}
                placeholder="G4S Courier Services Kenya Ltd"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">KRA PIN</label>
                <input
                  className="field-input font-mono"
                  value={form.partnerPin}
                  onChange={(e) => set({ partnerPin: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Billing email</label>
                <input
                  type="email"
                  className="field-input"
                  value={form.partnerEmail}
                  onChange={(e) => set({ partnerEmail: e.target.value })}
                  placeholder="accounts@g4s.co.ke"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Address</label>
              <input
                className="field-input"
                value={form.partnerAddress}
                onChange={(e) => set({ partnerAddress: e.target.value })}
                placeholder="G4S House, Waiyaki Way"
              />
            </div>
          </>
        )}

        {step === "admin" && (
          <>
            <p className="text-sm text-fleet-gray-500">
              Your fleet operator admin account — lands on the same dashboard Road Network
              Transporters uses today.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Admin username</label>
              <input
                className="field-input font-mono"
                value={form.adminUsername}
                onChange={(e) => set({ adminUsername: e.target.value.toLowerCase() })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fleet-gray-600">Password</label>
              <input
                type="password"
                className="field-input"
                value={form.adminPassword}
                onChange={(e) => set({ adminPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-fleet-sm border border-fleet-gray-200 p-3 xs:p-3.5">
              <input
                type="checkbox"
                checked={form.createPartnerPortal}
                onChange={(e) => set({ createPartnerPortal: e.target.checked })}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-fleet-gray-700">
                  <IconUsers size={16} className="shrink-0" /> Create partner portal login
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fleet-gray-500">
                  For {form.partnerName || "your partner"} to approve invoices &amp; work tickets
                  (username: <code className="font-mono">client</code>)
                </span>
              </span>
            </label>
            {form.createPartnerPortal && (
              <div>
                <label className="mb-1 block text-xs font-medium text-fleet-gray-600">
                  Partner portal password
                </label>
                <input
                  type="password"
                  className="field-input"
                  value={form.partnerPassword}
                  onChange={(e) => set({ partnerPassword: e.target.value })}
                  placeholder="Leave blank to auto-generate"
                  minLength={8}
                />
              </div>
            )}
          </>
        )}

        {step === "review" && (
          <div className="space-y-3 text-sm">
            <div className="rounded-fleet-sm bg-fleet-gray-50 p-4">
              <p className="font-medium text-fleet-gray-800">{form.name}</p>
              <p className="text-xs text-fleet-gray-500">Fleet operator · workspace /{form.slug}</p>
              {form.partnerName && (
                <p className="mt-2 text-fleet-gray-600">Partner: {form.partnerName}</p>
              )}
              <p className="mt-2 text-fleet-gray-600">
                Operator admin: <code className="font-mono">{form.adminUsername}</code>
              </p>
              {form.createPartnerPortal && (
                <p className="text-fleet-gray-600">
                  Partner portal: <code className="font-mono">client</code>
                </p>
              )}
            </div>
            <p className="text-xs text-fleet-gray-500">
              A dedicated database schema is created for {form.name}. Partners never share your
              operational data with other fleet operators.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-fleet-sm bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-2.5 pt-2 xs:flex-row xs:gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              className="btn-secondary w-full justify-center xs:flex-1"
              onClick={() => setStep(steps[stepIndex - 1].id)}
            >
              Back
            </button>
          )}
          {step !== "review" ? (
            <button
              type="button"
              className="btn-accent w-full justify-center xs:flex-1"
              disabled={!canNext}
              onClick={() => setStep(steps[stepIndex + 1].id)}
            >
              Continue <IconArrowRight size={16} />
            </button>
          ) : (
            <button type="submit" className="btn-accent w-full justify-center xs:flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <IconLoader2 size={16} className="animate-spin" /> Creating workspace…
                </>
              ) : (
                <>
                  <span className="xs:hidden">Create workspace</span>
                  <span className="hidden xs:inline">Create fleet operator workspace</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}
