import { IconArrowRight, IconCheck, IconClock, IconSend } from "@tabler/icons-react";
import type { InvoiceStatus } from "@/lib/types";

const STEPS: { status: InvoiceStatus | "soa"; label: string; detail: string }[] = [
  { status: "draft", label: "Draft", detail: "Fleet Admin creates invoice from schedule" },
  { status: "sent", label: "Sent to G4S", detail: "Invoice delivered to client portal for review" },
  { status: "pending", label: "Awaiting approval", detail: "G4S accounts team reviews line items" },
  { status: "approved", label: "Approved", detail: "G4S signs off — ready for payment processing" },
  { status: "paid", label: "Paid", detail: "Payment received per contract terms" },
];

const ICONS: Record<string, typeof IconCheck> = {
  draft: IconClock,
  sent: IconSend,
  pending: IconClock,
  approved: IconCheck,
  paid: IconCheck,
};

export function ApprovalWorkflowCard({ highlight }: { highlight?: InvoiceStatus }) {
  return (
    <div className="card mb-4">
      <div className="section-header">
        <div>
          <h2 className="text-[15px] font-semibold">Invoice approval workflow</h2>
          <p className="text-xs text-fleet-gray-400">
            Draft → Sent → G4S review → Approved → Paid. Rejected invoices return to Fleet Admin for correction.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {STEPS.map((step, i) => {
          const active = highlight === step.status;
          const Icon = ICONS[step.status] ?? IconClock;
          return (
            <div key={step.status} className="flex min-w-0 flex-1 items-start gap-2">
              <div
                className={`flex min-w-[120px] flex-1 flex-col gap-1 rounded-fleet-sm border p-2.5 ${
                  active ? "border-accent bg-accent-light" : "border-fleet-gray-100 bg-fleet-gray-50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-fleet-gray-500">
                  <Icon size={12} />
                  {step.label}
                </div>
                <p className="text-[11px] text-fleet-gray-500">{step.detail}</p>
              </div>
              {i < STEPS.length - 1 && (
                <IconArrowRight size={14} className="mt-4 hidden shrink-0 text-fleet-gray-300 sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
