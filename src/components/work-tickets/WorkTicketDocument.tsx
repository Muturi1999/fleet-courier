"use client";

import { IconPrinter } from "@tabler/icons-react";
import type { WorkTicket } from "@/lib/types";
import {
  formatG4sDate,
  formatG4sTime,
  G4S_CLIENT,
  legDistance,
  normalizeJourneyLeg,
  normalizeVehicleCondition,
  resolveOfficialKm,
  resolveTotalKm,
  WORK_TICKET_CONDITION_CHECKS,
} from "@/lib/work-ticket-meta";

function G4SLogo() {
  return (
    <div className="g4s-wt-logo" aria-hidden>
      <span className="g4s-wt-logo-mark">G4S</span>
    </div>
  );
}

export function WorkTicketDocument({
  ticket,
  onPrint,
  compact,
}: {
  ticket: WorkTicket;
  onPrint?: () => void;
  compact?: boolean;
}) {
  const officialKm = resolveOfficialKm(ticket);
  const totalKm = resolveTotalKm(ticket);
  const legs = ticket.legs.map((l) => normalizeJourneyLeg(l));
  const condition = normalizeVehicleCondition(ticket.vehicleCondition);
  const blankRows = Math.max(0, 6 - legs.length);
  const certDate = ticket.certificationDate || ticket.tripDate;

  return (
    <div
      className={`g4s-wt ${compact ? "g4s-wt-compact" : "g4s-wt-sheet"}`}
      id="work-ticket-print-root"
    >
      {ticket.headerNotes && (
        <p className="g4s-wt-header-note">{ticket.headerNotes}</p>
      )}

      <div className="g4s-wt-top">
        <G4SLogo />
        <div className="g4s-wt-heading">
          <div className="g4s-wt-company">{G4S_CLIENT.name}</div>
          <div className="g4s-wt-doc-title">Vehicle Work Ticket</div>
        </div>
        <div className="g4s-wt-serial">
          <span className="g4s-wt-serial-label">Serial No.</span>
          <span className="g4s-wt-serial-no">{ticket.serialNo}</span>
        </div>
      </div>

      <div className="g4s-wt-meta-block">
        <div className="g4s-wt-meta">
          <div className="g4s-wt-meta-row">
            <span>Branch</span>
            <span className="g4s-wt-meta-val">{ticket.branch}</span>
          </div>
          <div className="g4s-wt-meta-row">
            <span>Date</span>
            <span className="g4s-wt-meta-val">{formatG4sDate(ticket.tripDate)}</span>
          </div>
          <div className="g4s-wt-meta-row">
            <span>Reg. No. of Vehicle</span>
            <span className="g4s-wt-meta-val">{ticket.plate}</span>
          </div>
          <div className="g4s-wt-meta-row">
            <span>Make</span>
            <span className="g4s-wt-meta-val">{ticket.make}</span>
          </div>
          <div className="g4s-wt-meta-row">
            <span>Name of Driver</span>
            <span className="g4s-wt-meta-val">{ticket.driverName || ""}</span>
          </div>
          <div className="g4s-wt-meta-row">
            <span>Type</span>
            <span className="g4s-wt-meta-val">{ticket.vehicleType || ""}</span>
          </div>
        </div>
      </div>

      <div className="g4s-wt-main">
        <div className="g4s-wt-table-wrap">
          <table className="g4s-wt-table">
            <thead>
              <tr>
                <th rowSpan={2} className="g4s-wt-col-details">Details of Journey</th>
                <th colSpan={3}>Start of Journey</th>
                <th rowSpan={2} className="g4s-wt-col-fuel">Fuel Drawn</th>
                <th colSpan={5}>End of Journey</th>
              </tr>
              <tr>
                <th>Opening Mileage</th>
                <th>Time Out</th>
                <th>Officer Authorising Journey</th>
                <th>Time In</th>
                <th>Closing Mileage</th>
                <th>Total Distance Covered</th>
                <th>Type of Service Done</th>
                <th>Officer Confirming Journey</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg) => (
                <tr key={leg.id}>
                  <td className="g4s-wt-col-details align-top">
                    <span className="block whitespace-pre-wrap text-left leading-snug">{leg.details}</span>
                  </td>
                  <td className="g4s-wt-num">{leg.openingMileage || ""}</td>
                  <td className="g4s-wt-time">{formatG4sTime(leg.timeOut)}</td>
                  <td>{leg.officerAuthorising}</td>
                  <td className="g4s-wt-num">{leg.fuelDrawn}</td>
                  <td className="g4s-wt-time">{formatG4sTime(leg.timeIn)}</td>
                  <td className="g4s-wt-num">{leg.closingMileage || ""}</td>
                  <td className="g4s-wt-num">{legDistance(leg) || ""}</td>
                  <td>{leg.serviceDone || leg.journeyType}</td>
                  <td>{leg.officerConfirming}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} className="g4s-wt-blank-row">
                  <td>&nbsp;</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <table className="g4s-wt-condition">
          <thead>
            <tr>
              <th colSpan={2}>Vehicle Condition</th>
            </tr>
            <tr>
              <th colSpan={2} className="g4s-wt-condition-sub">End of Journey</th>
            </tr>
          </thead>
          <tbody>
            {WORK_TICKET_CONDITION_CHECKS.map(({ key, label }) => (
              <tr key={key}>
                <th>{label}</th>
                <td>{condition[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="g4s-wt-bottom">
        <div className="g4s-wt-notes">
          <p className="g4s-wt-form-ref">W.S. 18 (4/07)</p>
          <p className="g4s-wt-instruction">
            Note &apos;Type of Journey&apos; Fill in A/V for C.I.T S/S for Static Courier of Cars as the case may be.
          </p>
          {ticket.route && (
            <p className="g4s-wt-route g4s-wt-internal">
              <strong>Route (billing):</strong> {ticket.route}
            </p>
          )}
          {ticket.gatePassRef && (
            <p className="g4s-wt-route g4s-wt-internal">
              <strong>Gate pass:</strong> {ticket.gatePassRef}
            </p>
          )}
          <div className="g4s-wt-cert">
            <p>I certify that I have checked the above and they are all correct.</p>
            <p className="g4s-wt-cert-line">
              <span>Signature of Driver</span>
              <span className="g4s-wt-cert-val">{ticket.driverSignature || ""}</span>
            </p>
            <p className="g4s-wt-cert-line">
              <span>Date</span>
              <span className="g4s-wt-cert-val">{certDate ? formatG4sDate(certDate) : ""}</span>
            </p>
          </div>
        </div>

        <table className="g4s-wt-summary">
          <tbody>
            <tr>
              <th>Private</th>
              <td className="g4s-wt-num">{ticket.privateKm || ""}</td>
            </tr>
            <tr>
              <th>Official</th>
              <td className="g4s-wt-num">{officialKm || ""}</td>
            </tr>
            <tr>
              <th>Total</th>
              <td className="g4s-wt-num">{totalKm || ""}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {onPrint && (
        <div className="mt-4 flex justify-end print:hidden">
          <button type="button" className="btn-accent btn-sm" onClick={onPrint}>
            <IconPrinter size={14} /> Print / Save PDF
          </button>
        </div>
      )}
    </div>
  );
}

export function printWorkTicket() {
  window.print();
}
