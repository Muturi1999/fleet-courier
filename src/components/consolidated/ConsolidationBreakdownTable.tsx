"use client";

import {
  BREAKDOWN_LABEL_COL_SPAN,
  CONSOLIDATION_BREAKDOWN_COLUMNS,
  fmtBreakdownMoney,
  formatBreakdownDate,
  groupBreakdownByVehicle,
  sumBreakdownLines,
  type ConsolidationBreakdownLine,
  type VehicleBreakdownGroup,
} from "@/lib/consolidation-breakdown";

function BreakdownRow({ line }: { line: ConsolidationBreakdownLine }) {
  return (
    <tr>
      <td className="whitespace-nowrap">{formatBreakdownDate(line.tripDate)}</td>
      <td className="font-mono">{line.plate || "—"}</td>
      <td>{line.branch || "—"}</td>
      <td className="font-mono">{line.ton || "—"}</td>
      <td>{line.serviceType || "—"}</td>
      <td>{line.route}</td>
      <td className="text-center font-mono tabular-nums">{line.trips}</td>
      <td className="text-right font-mono">{fmtBreakdownMoney(line.net)}</td>
      <td className="text-right font-mono">{fmtBreakdownMoney(line.vat)}</td>
      <td className="text-right font-mono">{fmtBreakdownMoney(line.total)}</td>
    </tr>
  );
}

function VehicleSubtotalRow({ group }: { group: VehicleBreakdownGroup }) {
  return (
    <tr className="consolidated-breakdown-subtotal">
      <th colSpan={BREAKDOWN_LABEL_COL_SPAN} className="text-right">
        {group.plate} subtotal
      </th>
      <td className="text-right font-mono font-semibold">{fmtBreakdownMoney(group.net)}</td>
      <td className="text-right font-mono font-semibold">{fmtBreakdownMoney(group.vat)}</td>
      <td className="text-right font-mono font-semibold">{fmtBreakdownMoney(group.total)}</td>
    </tr>
  );
}

/** Blank row between vehicles — keeps layout ready to restore subtotals later. */
function VehicleSeparatorRow() {
  return (
    <tr className="consolidated-breakdown-separator" aria-hidden>
      <td colSpan={BREAKDOWN_LABEL_COL_SPAN + 3} className="h-2 border-0 bg-transparent p-0" />
    </tr>
  );
}

export function ConsolidationBreakdownTable({
  lines,
  groups,
  layout = "flat",
  compact = false,
  showGrandTotal = true,
  grandNet,
  grandTotal,
  vehicleSubtotals = "separator",
}: {
  lines?: ConsolidationBreakdownLine[];
  groups?: VehicleBreakdownGroup[];
  layout?: "flat" | "byVehicle";
  compact?: boolean;
  showGrandTotal?: boolean;
  grandNet?: number;
  grandTotal?: number;
  /** separator = blank row between vehicles; full = labeled subtotal amounts (legacy). */
  vehicleSubtotals?: "separator" | "full";
}) {
  const vehicleGroups =
    groups ?? (layout === "byVehicle" && lines ? groupBreakdownByVehicle(lines) : null);

  const flatLines = lines ?? vehicleGroups?.flatMap((g) => g.lines) ?? [];
  const summed = sumBreakdownLines(flatLines);
  const totals = {
    net: grandNet ?? summed.net,
    total: grandTotal ?? summed.total,
  };

  const tableClass = compact
    ? "consolidated-doc-table consolidated-breakdown-table text-[10px]"
    : "consolidated-doc-table consolidated-breakdown-table text-[11px]";

  return (
    <table className={tableClass}>
      <thead>
        <tr>
          {CONSOLIDATION_BREAKDOWN_COLUMNS.map((col) => (
            <th
              key={col.key}
              className={"align" in col && col.align === "right" ? "text-right" : undefined}
            >
              {col.label}
            </th>
          ))}
          <th className="text-right">Net</th>
          <th className="text-right">VAT</th>
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {layout === "byVehicle" && vehicleGroups
          ? vehicleGroups.map((group) => (
              <VehicleGroupRows key={group.plate} group={group} vehicleSubtotals={vehicleSubtotals} />
            ))
          : flatLines.map((line) => <BreakdownRow key={line.id} line={line} />)}
      </tbody>
      {showGrandTotal && flatLines.length > 0 && (
        <tfoot>
          <tr className="consolidated-doc-grand">
            <th colSpan={BREAKDOWN_LABEL_COL_SPAN} className="text-right">
              TOTAL
            </th>
            <td className="text-right font-mono font-bold">{fmtBreakdownMoney(totals.net)}</td>
            <td className="text-right font-mono font-bold">{fmtBreakdownMoney(summed.vat)}</td>
            <td className="text-right font-mono font-bold">{fmtBreakdownMoney(totals.total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function VehicleGroupRows({
  group,
  vehicleSubtotals,
}: {
  group: VehicleBreakdownGroup;
  vehicleSubtotals: "separator" | "full";
}) {
  return (
    <>
      {group.lines.map((line) => (
        <BreakdownRow key={line.id} line={line} />
      ))}
      {vehicleSubtotals === "full" ? <VehicleSubtotalRow group={group} /> : <VehicleSeparatorRow />}
    </>
  );
}
