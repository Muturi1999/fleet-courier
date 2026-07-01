import { formatPeriodRange, sortConsolidatedNewestFirst } from "./consolidation";
import { formatBillingPeriodMonth } from "./dates";
import type { ConsolidatedInvoice, ConsolidatedInvoiceStatus, Invoice } from "./types";

export type WorkflowStepState = "done" | "active" | "pending" | "rejected";

export type DashboardWorkflowStep = {
  state: WorkflowStepState;
  num: string;
  title: string;
  sub: string;
};

export type DashboardWorkflowInput = {
  scheduleCount: number;
  invoices: Invoice[];
  consolidated: ConsolidatedInvoice[];
  etims?: {
    enabled: boolean;
    awaitingFiling: number;
    filed: number;
    failed: number;
  };
  periodLabel: string;
};

function consolidatedPeriodLabel(inv: ConsolidatedInvoice): string {
  if (!inv.periodStart) return "—";
  if (!inv.periodEnd || inv.periodStart.slice(0, 7) === inv.periodEnd.slice(0, 7)) {
    return formatBillingPeriodMonth(inv.periodStart);
  }
  return formatPeriodRange(inv.periodStart, inv.periodEnd);
}

function soaLabel(inv: ConsolidatedInvoice): string {
  return `SOA ${inv.invoiceNo} · ${consolidatedPeriodLabel(inv)}`;
}

/** Latest consolidated SOA in the client workflow (excludes superseded and unsent drafts). */
export function pickWorkflowConsolidated(consolidated: ConsolidatedInvoice[]): ConsolidatedInvoice | null {
  const rows = sortConsolidatedNewestFirst(
    consolidated.filter((c) => c.status !== "draft" && !c.supersededById),
  );
  return rows[0] ?? null;
}

function statusPhrase(status: ConsolidatedInvoiceStatus): string {
  switch (status) {
    case "pending_approval":
      return "Awaiting approval";
    case "rejected":
      return "Rejected";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}

export function buildDashboardWorkflow(input: DashboardWorkflowInput): {
  steps: DashboardWorkflowStep[];
  pendingApprovalLabel: string;
  pendingApprovalCount: number;
} {
  const { scheduleCount, invoices, consolidated, etims, periodLabel } = input;
  const invoiceCount = invoices.length;
  const activeSoa = pickWorkflowConsolidated(consolidated);
  const pendingConsolidated = consolidated.filter(
    (c) => c.status === "pending_approval" && !c.supersededById,
  );
  const individualPending = invoices.filter((i) => i.status === "sent" || i.status === "pending");

  const pendingApprovalCount =
    activeSoa?.status === "pending_approval"
      ? 1
      : activeSoa?.status === "rejected"
        ? 1
        : pendingConsolidated.length || individualPending.length;

  const pendingApprovalLabel =
    activeSoa?.status === "pending_approval"
      ? `${soaLabel(activeSoa)} · Awaiting`
      : activeSoa?.status === "rejected"
        ? `${soaLabel(activeSoa)} · Rejected`
        : pendingConsolidated[0]
          ? `${soaLabel(pendingConsolidated[0])} · Awaiting`
          : individualPending.length > 0
            ? `${individualPending.length} invoice(s)`
            : "All clear";

  const soaSent = Boolean(activeSoa);
  const soaApproved = activeSoa?.status === "approved" || activeSoa?.status === "paid";
  const soaRejected = activeSoa?.status === "rejected";
  const soaPending = activeSoa?.status === "pending_approval";
  const soaPaid = activeSoa?.status === "paid";

  const etimsEnabled = etims?.enabled ?? false;
  const etimsAwaiting = etims?.awaitingFiling ?? 0;
  const etimsFiled = etims?.filed ?? 0;
  const etimsComplete = etimsEnabled && soaApproved && etimsAwaiting === 0 && etimsFiled > 0;

  let step4State: WorkflowStepState = "pending";
  let step4Sub = "No SOA in approval";

  if (activeSoa) {
    if (soaPending) {
      step4State = "active";
      step4Sub = `${soaLabel(activeSoa)} · ${statusPhrase("pending_approval")}`;
    } else if (soaRejected) {
      step4State = "rejected";
      step4Sub = `${soaLabel(activeSoa)} · ${statusPhrase("rejected")}`;
    } else if (soaApproved || soaPaid) {
      step4State = "done";
      step4Sub = `${soaLabel(activeSoa)} · ${statusPhrase(activeSoa.status)}`;
    } else {
      step4Sub = soaLabel(activeSoa);
    }
  } else if (individualPending.length > 0) {
    step4State = "active";
    step4Sub = `${individualPending.length} invoice(s) awaiting approval`;
  }

  let step5State: WorkflowStepState = "pending";
  let step5Sub = etimsEnabled ? "Validate & submit manually on KRA eTIMS" : "Via invoice workflow";

  if (soaApproved || soaPaid) {
    if (etimsComplete || soaPaid) {
      step5State = "done";
      step5Sub = etimsFiled > 0 ? `${etimsFiled} filed on eTIMS` : "Complete";
    } else if (etimsEnabled && etimsAwaiting > 0) {
      step5State = "active";
      step5Sub =
        activeSoa && etimsAwaiting <= 3
          ? `SOA ${activeSoa.invoiceNo} ready — validate & submit on eTIMS`
          : `${etimsAwaiting} awaiting manual eTIMS filing`;
    } else if (soaApproved) {
      step5State = "active";
      step5Sub = activeSoa
        ? `SOA ${activeSoa.invoiceNo} — validate & submit on eTIMS`
        : "Validate & submit consolidated SOA on eTIMS";
    }
  } else if (invoices.some((i) => i.status === "approved" || i.status === "paid")) {
    step5State = etimsComplete ? "done" : etimsAwaiting > 0 ? "active" : "pending";
    step5Sub =
      etimsAwaiting > 0
        ? `${etimsAwaiting} awaiting eTIMS`
        : etimsFiled > 0
          ? `${etimsFiled} filed on eTIMS`
          : step5Sub;
  }

  const paidCount = consolidated.filter((c) => c.status === "paid").length;
  const individualPaid = invoices.filter((i) => i.status === "paid").length;

  let step6State: WorkflowStepState = "pending";
  let step6Sub = "After KRA eTIMS filing";

  if (soaPaid || paidCount > 0 || individualPaid > 0) {
    step6State = "done";
    step6Sub = soaPaid
      ? `${soaLabel(activeSoa!)} · Paid`
      : paidCount > 0
        ? `${paidCount} SOA paid`
        : `${individualPaid} invoice(s) paid`;
  } else if (etimsComplete && soaApproved && activeSoa) {
    step6State = "active";
    step6Sub = `${soaLabel(activeSoa)} · Awaiting payment`;
  } else if (soaApproved && activeSoa) {
    step6Sub = `${soaLabel(activeSoa)} · Awaiting payment after eTIMS`;
  }

  const steps: DashboardWorkflowStep[] = [
    {
      state: scheduleCount > 0 ? "done" : "pending",
      num: "Step 1",
      title: "Schedule entry",
      sub: `${scheduleCount} lines logged`,
    },
    {
      state: invoiceCount > 0 ? "done" : "pending",
      num: "Step 2",
      title: "Invoices generated",
      sub: `${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"}`,
    },
    {
      state: soaSent ? "done" : invoiceCount > 0 ? "pending" : "pending",
      num: "Step 3",
      title: "SOA sent to G4S",
      sub: activeSoa
        ? `${soaLabel(activeSoa)} · ${activeSoa.totalTrips} trip(s)`
        : individualPending.length > 0
          ? `${individualPending.length} individual invoice(s) sent`
          : "Not sent yet",
    },
    {
      state: step4State,
      num: "Step 4",
      title: "G4S approval",
      sub: step4Sub,
    },
    {
      state: step5State,
      num: "Step 5",
      title: "KRA eTIMS submitted",
      sub: step5Sub,
    },
    {
      state: step6State,
      num: "Step 6",
      title: "Payment received",
      sub: step6Sub,
    },
  ];

  return { steps, pendingApprovalLabel, pendingApprovalCount };
}
