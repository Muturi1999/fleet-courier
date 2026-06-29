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
      <td className="text-right font-mono">{fmtBreakdownMoney(line.cost)}</td>
      <td />
    </tr>
  );
}

function VehicleSubtotalRow({ group }: { group: VehicleBreakdownGroup }) {
  return (
    <tr className="consolidated-breakdown-subtotal">
      <th colSpan={BREAKDOWN_LABEL_COL_SPAN} className="text-right">
        {group.plate} — ex VAT / inc VAT
      </th>
      <td className="text-right font-mono font-semibold">{fmtBreakdownMoney(group.net)}</td>
      <td className="text-right font-mono font-semibold">{fmtBreakdownMoney(group.total)}</td>
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
}: {
  lines?: ConsolidationBreakdownLine[];
  groups?: VehicleBreakdownGroup[];
  layout?: "flat" | "byVehicle";
  compact?: boolean;
  showGrandTotal?: boolean;
  grandNet?: number;
  grandTotal?: number;
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
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {layout === "byVehicle" && vehicleGroups
          ? vehicleGroups.map((group) => (
              <VehicleGroupRows key={group.plate} group={group} />
            ))
          : flatLines.map((line) => <BreakdownRow key={line.id} line={line} />)}
      </tbody>
      {showGrandTotal && flatLines.length > 0 && (
        <tfoot>
          <tr className="consolidated-doc-grand">
            <th colSpan={BREAKDOWN_LABEL_COL_SPAN} className="text-right">
              TOTAL — ex VAT / inc VAT
            </th>
            <td className="text-right font-mono font-bold">{fmtBreakdownMoney(totals.net)}</td>
            <td className="text-right font-mono font-bold">{fmtBreakdownMoney(totals.total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function VehicleGroupRows({ group }: { group: VehicleBreakdownGroup }) {
  return (
    <>
      {group.lines.map((line) => (
        <BreakdownRow key={line.id} line={line} />
      ))}
      <VehicleSubtotalRow group={group} />
    </>
  );
}
