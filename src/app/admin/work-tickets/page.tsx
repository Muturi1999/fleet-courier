"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconClipboardList,
  IconEdit,
  IconEye,
  IconPlus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard, MetricsGrid } from "@/components/ui/MetricCard";
import { Pagination } from "@/components/ui/Pagination";
import { FormActions, FormField } from "@/components/ui/Modal";
import { RecordScreen } from "@/components/layout/RecordScreen";
import { WorkTicketDocument, printWorkTicket } from "@/components/work-tickets/WorkTicketDocument";
import { WorkTicketLegForm } from "@/components/work-tickets/WorkTicketLegForm";
import { clearedFilters, highlightSearch } from "@/lib/filters";
import type { FleetFilters } from "@/lib/filters";
import type { Rate, Vehicle, WorkTicket, WorkTicketJourneyLeg, WorkTicketStatus } from "@/lib/types";
import {
  DRIVER_OPTIONS,
  G4S_CLIENT,
  VEHICLE_MAKE_BY_PLATE,
  calcWorkTicketAmounts,
  emptyJourneyLeg,
  generateWorkTicketSerial,
  sumLegDistances,
} from "@/lib/work-ticket-meta";
import { useToast } from "@/context/ToastContext";
import { useCrud } from "@/hooks/useCrud";
import { usePageScreen } from "@/hooks/usePageScreen";
import { usePagination } from "@/hooks/usePagination";

const PAGE = "Work tickets";
const statuses: WorkTicketStatus[] = ["draft", "sent", "approved", "rejected"];

type FormState = Omit<WorkTicket, "id">;

function emptyTicket(existing: WorkTicket[], vehicles: Vehicle[]): FormState {
  const plate = vehicles[0]?.plate ?? "";
  const amounts = calcWorkTicketAmounts(8500);
  return {
    serialNo: generateWorkTicketSerial(existing),
    branch: G4S_CLIENT.defaultBranch,
    tripDate: new Date().toISOString().slice(0, 10),
    plate,
    make: VEHICLE_MAKE_BY_PLATE[plate] ?? "",
    driverName: "",
    route: "",
    rateType: "fixed",
    agreedRate: 8500,
    gatePassRef: "",
    headerNotes: "",
    legs: [emptyJourneyLeg()],
    privateKm: 0,
    officialKm: 0,
    ...amounts,
    status: "draft",
  };
}

function filterTickets(items: WorkTicket[], filters: FleetFilters, tab: string) {
  return items.filter((t) => {
    if (tab !== "all" && t.status !== tab) return false;
    const q = filters.search?.toLowerCase().trim();
    if (
      q &&
      !t.serialNo.includes(q) &&
      !t.plate.toLowerCase().includes(q) &&
      !t.driverName?.toLowerCase().includes(q) &&
      !t.route.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filters.status && t.status !== filters.status) return false;
    return true;
  });
}

export default function WorkTicketsPage() {
  const { toast } = useToast();
  const { items, loading, create, update, remove, refresh } = useCrud<WorkTicket>("work-tickets");
  const { items: vehicles } = useCrud<Vehicle>("vehicles");
  const { items: rates } = useCrud<Rate>("rates");
  const { screen, isList, openCreate, openEdit, openView, close } = usePageScreen();

  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState<FleetFilters>(clearedFilters());
  const [form, setForm] = useState<FormState>(emptyTicket([], []));
  const [printOnOpen, setPrintOnOpen] = useState(false);

  useEffect(() => {
    if (screen.kind === "view" && printOnOpen) {
      setPrintOnOpen(false);
      const t = setTimeout(printWorkTicket, 150);
      return () => clearTimeout(t);
    }
  }, [screen, printOnOpen]);

  useEffect(() => {
    if (screen.kind === "edit") {
      const t = items.find((x) => x.id === screen.id);
      if (t) setForm({ ...t, legs: t.legs.map((l) => ({ ...l })) });
    } else if (screen.kind === "create") {
      setForm(emptyTicket(items, vehicles));
    }
  }, [screen, items, vehicles]);

  const filtered = useMemo(() => filterTickets(items, filters, tab), [items, filters, tab]);
  const filterKey = JSON.stringify({ filters, tab });
  const { paginated, ...pagination } = usePagination(filtered, filterKey);

  const totals = useMemo(
    () => ({
      count: items.length,
      draft: items.filter((t) => t.status === "draft").length,
      sent: items.filter((t) => t.status === "sent").length,
      approved: items.filter((t) => t.status === "approved").length,
    }),
    [items],
  );

  const syncPlate = (plate: string) => {
    const make = VEHICLE_MAKE_BY_PLATE[plate] ?? form.make;
    setForm((f) => ({ ...f, plate, make }));
  };

  const syncRouteRate = (routeName: string) => {
    const rate = rates.find((r) => r.route === routeName);
    if (!rate) {
      setForm((f) => ({ ...f, route: routeName }));
      return;
    }
    const amounts = calcWorkTicketAmounts(rate.rate);
    setForm((f) => ({ ...f, route: routeName, agreedRate: rate.rate, ...amounts }));
  };

  const setAgreedRate = (agreedRate: number) => {
    const amounts = calcWorkTicketAmounts(agreedRate);
    setForm((f) => ({ ...f, agreedRate, ...amounts }));
  };

  const updateLeg = (legId: string, patch: Partial<WorkTicketJourneyLeg>) => {
    setForm((f) => {
      const legs = f.legs.map((l) => (l.id === legId ? { ...l, ...patch } : l));
      const officialKm = sumLegDistances(legs);
      return { ...f, legs, officialKm };
    });
  };

  const addLeg = () => setForm((f) => ({ ...f, legs: [...f.legs, emptyJourneyLeg()] }));

  const removeLeg = (legId: string) =>
    setForm((f) => {
      const legs = f.legs.filter((l) => l.id !== legId);
      return { ...f, legs: legs.length ? legs : [emptyJourneyLeg()], officialKm: sumLegDistances(legs) };
    });

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      const payload = {
        ...form,
        officialKm: form.officialKm || sumLegDistances(form.legs),
      };
      if (screen.kind === "edit") {
        await update(screen.id, payload);
        toast("Work ticket updated");
        setFilters(highlightSearch(form.plate || form.serialNo));
      } else {
        await create(payload);
        toast("Work ticket created");
        setFilters(highlightSearch(form.plate || form.serialNo));
      }
      close();
    } catch {
      toast("Save failed");
    }
  };

  const shareTicket = async (t: WorkTicket) => {
    const res = await fetch(`/api/work-tickets/${t.id}/share`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      toast(err.message ?? err.error ?? "Share failed");
      return;
    }
    await refresh();
    toast(`Work ticket ${t.serialNo} shared with G4S`);
  };

  const approveTicket = async (t: WorkTicket) => {
    const res = await fetch(`/api/work-tickets/${t.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      toast(err.message ?? err.error ?? "Approval failed");
      return;
    }
    await refresh();
    toast(`Work ticket ${t.serialNo} approved`);
  };

  const crumbs = [{ label: PAGE, onClick: close }];

  if (screen.kind === "view") {
    const ticket = items.find((t) => t.id === screen.id);
    if (!ticket) {
      close();
      return null;
    }
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: ticket.serialNo }]}
        title={`Work ticket ${ticket.serialNo}`}
        onBack={close}
      >
        <WorkTicketDocument ticket={ticket} onPrint={printWorkTicket} />
      </RecordScreen>
    );
  }

  if (screen.kind === "create" || screen.kind === "edit") {
    return (
      <RecordScreen
        crumbs={[...crumbs, { label: screen.kind === "edit" ? "Edit" : "New work ticket" }]}
        title={screen.kind === "edit" ? "Edit work ticket" : "Create work ticket"}
        onBack={close}
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <section className="card grid grid-cols-2 gap-3">
            <h3 className="col-span-2 text-sm font-semibold text-navy">General ticket info</h3>
            <FormField label="Serial No.">
              <input className="field-input bg-fleet-gray-50 font-mono" readOnly value={form.serialNo} />
            </FormField>
            <FormField label="Date of trip *">
              <input
                type="date"
                className="field-input"
                required
                value={form.tripDate}
                onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
              />
            </FormField>
            <FormField label="Branch *">
              <input
                className="field-input"
                required
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              />
            </FormField>
            <FormField label="Driver name (optional)">
              <input
                list="driver-options"
                className="field-input"
                value={form.driverName}
                placeholder="Leave blank if not assigned"
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              />
              <datalist id="driver-options">
                {DRIVER_OPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Header notes" className="col-span-2">
              <input
                className="field-input"
                placeholder="e.g. seal numbers, shift"
                value={form.headerNotes ?? ""}
                onChange={(e) => setForm({ ...form, headerNotes: e.target.value })}
              />
            </FormField>
          </section>

          <section className="card grid grid-cols-2 gap-3">
            <h3 className="col-span-2 text-sm font-semibold text-navy">Vehicle details</h3>
            <FormField label="Vehicle registration *">
              <select
                className="field-input font-mono"
                required
                value={form.plate}
                onChange={(e) => syncPlate(e.target.value)}
              >
                <option value="">Select plate</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plate}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Make *">
              <input
                className="field-input"
                required
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
              />
            </FormField>
            <FormField label="Private KM">
              <input
                type="number"
                min={0}
                className="field-input"
                value={form.privateKm}
                onChange={(e) => setForm({ ...form, privateKm: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Official KM (auto from legs)">
              <input className="field-input bg-fleet-gray-50" readOnly value={form.officialKm || sumLegDistances(form.legs)} />
            </FormField>
          </section>

          <section className="card grid grid-cols-2 gap-3">
            <h3 className="col-span-2 text-sm font-semibold text-navy">G4S trip &amp; rate</h3>
            <FormField label="Route / destination *" className="col-span-2">
              <input
                list="route-options"
                className="field-input"
                required
                value={form.route}
                onChange={(e) => syncRouteRate(e.target.value)}
              />
              <datalist id="route-options">
                {rates.map((r) => (
                  <option key={r.id} value={r.route} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Rate type">
              <select
                className="field-input"
                value={form.rateType}
                onChange={(e) =>
                  setForm({ ...form, rateType: e.target.value as WorkTicket["rateType"] })
                }
              >
                <option value="fixed">Fixed special rate per trip</option>
                <option value="per_km">Rate per kilometre</option>
              </select>
            </FormField>
            <FormField label="Agreed rate (KES) *">
              <input
                type="number"
                min={0}
                className="field-input"
                required
                value={form.agreedRate}
                onChange={(e) => setAgreedRate(Number(e.target.value))}
              />
            </FormField>
            <FormField label="G4S gate pass / reference">
              <input
                className="field-input"
                value={form.gatePassRef ?? ""}
                onChange={(e) => setForm({ ...form, gatePassRef: e.target.value })}
              />
            </FormField>
            <FormField label="Scan filename (optional)">
              <input
                className="field-input"
                placeholder="work-ticket-scan.jpg"
                value={form.attachmentName ?? ""}
                onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
              />
            </FormField>
            <div className="col-span-2 text-xs text-fleet-gray-400">
              Net KES {form.net.toLocaleString()} · VAT KES {form.vat.toLocaleString()} · Total KES{" "}
              {form.total.toLocaleString()}
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-navy">Journey log</h3>
                <p className="mt-0.5 text-xs text-fleet-gray-400">
                  Add one card per leg. Use the message field for routes, stops, and bullet lists.
                </p>
              </div>
              <button type="button" className="btn-secondary btn-sm" onClick={addLeg}>
                <IconPlus size={14} /> Add leg
              </button>
            </div>
            <div className="space-y-4">
              {form.legs.map((leg, index) => (
                <WorkTicketLegForm
                  key={leg.id}
                  leg={leg}
                  index={index}
                  onChange={(patch) => updateLeg(leg.id, patch)}
                  onRemove={() => removeLeg(leg.id)}
                  canRemove={form.legs.length > 1}
                />
              ))}
            </div>
          </section>

          <FormActions onCancel={close} submitLabel={screen.kind === "edit" ? "Update ticket" : "Save ticket"} />
        </form>
      </RecordScreen>
    );
  }

  if (!isList) return null;

  return (
    <>
      <MetricsGrid>
        <MetricCard accent="navy" icon={IconClipboardList} label="Total tickets" value={String(totals.count)} sub="All statuses" />
        <MetricCard accent="amber" icon={IconClipboardList} label="Draft" value={String(totals.draft)} sub="Not yet shared" />
        <MetricCard accent="teal" icon={IconSend} label="Sent to G4S" value={String(totals.sent)} sub="Awaiting approval" />
        <MetricCard accent="teal" icon={IconCheck} label="Approved" value={String(totals.approved)} sub="Ready to invoice" />
      </MetricsGrid>

      <div className="mb-3 flex flex-wrap gap-2">
        {["all", ...statuses].map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "filter-tab filter-tab-active" : "filter-tab"}
            onClick={() => setTab(s)}
          >
            {s === "all" ? `All (${items.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        fields={["search", "status"]}
        statusKind="invoice"
        resultCount={filtered.length}
      >
        <button
          type="button"
          className="btn-accent btn-sm"
          onClick={() => {
            setForm(emptyTicket(items, vehicles));
            openCreate();
          }}
        >
          <IconPlus size={14} /> New work ticket
        </button>
      </FilterBar>

      <div className="table-wrap">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Distance</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-fleet-gray-400">
                  No work tickets match filters
                </td>
              </tr>
            ) : (
              paginated.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold text-[#c41e1e]">{t.serialNo}</td>
                  <td className="whitespace-nowrap text-xs">{t.tripDate}</td>
                  <td className="font-mono">{t.plate}</td>
                  <td>{t.driverName || "—"}</td>
                  <td className="max-w-[160px] truncate text-xs">{t.route}</td>
                  <td className="font-mono text-xs">{t.officialKm || sumLegDistances(t.legs)} km</td>
                  <td className="font-mono font-medium">{t.total.toLocaleString()}</td>
                  <td>
                    <Badge variant={t.status === "approved" ? "approved" : t.status === "sent" ? "sent" : t.status === "rejected" ? "rejected" : "draft"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex flex-nowrap gap-1">
                      <button type="button" className="btn-secondary btn-sm shrink-0" title="View" onClick={() => openView(t.id)}>
                        <IconEye size={14} />
                      </button>
                      {t.status === "draft" && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm shrink-0"
                          title="Edit"
                          onClick={() => {
                            setForm({ ...t, legs: t.legs.map((l) => ({ ...l })) });
                            openEdit(t.id);
                          }}
                        >
                          <IconEdit size={14} />
                        </button>
                      )}
                      {t.status === "draft" && (
                        <button
                          type="button"
                          className="btn-accent btn-sm shrink-0"
                          title="Share with G4S"
                          onClick={() => shareTicket(t)}
                        >
                          <IconSend size={14} />
                        </button>
                      )}
                      {t.status === "sent" && (
                        <button
                          type="button"
                          className="btn-accent btn-sm shrink-0"
                          title="Approve"
                          onClick={() => approveTicket(t)}
                        >
                          <IconCheck size={14} />
                        </button>
                      )}
                      {t.status === "draft" && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm shrink-0 text-fleet-red"
                          title="Delete"
                          onClick={async () => {
                            if (confirm("Delete this work ticket?")) {
                              await remove(t.id);
                              toast("Deleted");
                            }
                          }}
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPage={pagination.setPage} />
    </>
  );
}
