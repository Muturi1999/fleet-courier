"use client";

import { IconTrash } from "@tabler/icons-react";
import { FormField } from "@/components/ui/Modal";
import { JourneyDetailsEditor } from "@/components/work-tickets/JourneyDetailsEditor";
import { legDistance } from "@/lib/work-ticket-meta";
import type { WorkTicketJourneyLeg } from "@/lib/types";

type WorkTicketLegFormProps = {
  leg: WorkTicketJourneyLeg;
  index: number;
  onChange: (patch: Partial<WorkTicketJourneyLeg>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export function WorkTicketLegForm({ leg, index, onChange, onRemove, canRemove }: WorkTicketLegFormProps) {
  const distance = legDistance(leg);

  return (
    <article className="rounded-fleet-md border border-fleet-gray-100 bg-fleet-gray-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-navy">Journey leg {index + 1}</h4>
        {canRemove && (
          <button type="button" className="btn-secondary btn-sm text-fleet-red" onClick={onRemove}>
            <IconTrash size={14} /> Remove leg
          </button>
        )}
      </div>

      <FormField label="Details of journey" className="mb-4">
        <JourneyDetailsEditor value={leg.details} onChange={(details) => onChange({ details })} />
      </FormField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Opening mileage (km)">
          <input
            type="number"
            min={0}
            className="field-input w-full"
            value={leg.openingMileage || ""}
            onChange={(e) => onChange({ openingMileage: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Time out">
          <input
            className="field-input w-full font-mono"
            placeholder="0822"
            value={leg.timeOut}
            onChange={(e) => onChange({ timeOut: e.target.value })}
          />
        </FormField>
        <FormField label="Officer authorising journey">
          <input
            className="field-input w-full"
            value={leg.officerAuthorising}
            onChange={(e) => onChange({ officerAuthorising: e.target.value })}
          />
        </FormField>
        <FormField label="Fuel drawn">
          <input
            className="field-input w-full"
            placeholder="e.g. 28L"
            value={leg.fuelDrawn}
            onChange={(e) => onChange({ fuelDrawn: e.target.value })}
          />
        </FormField>
        <FormField label="Time in">
          <input
            className="field-input w-full font-mono"
            placeholder="1700"
            value={leg.timeIn}
            onChange={(e) => onChange({ timeIn: e.target.value })}
          />
        </FormField>
        <FormField label="Closing mileage (km)">
          <input
            type="number"
            min={0}
            className="field-input w-full"
            value={leg.closingMileage || ""}
            onChange={(e) => onChange({ closingMileage: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Total distance covered (km)">
          <input className="field-input w-full bg-fleet-gray-50 font-mono" readOnly value={distance || ""} />
        </FormField>
        <FormField label="Type of service done">
          <input
            className="field-input w-full"
            placeholder="Maintenance or service notes"
            value={leg.serviceDone}
            onChange={(e) => onChange({ serviceDone: e.target.value })}
          />
        </FormField>
        <FormField label="Officer confirming journey">
          <input
            className="field-input w-full"
            value={leg.officerConfirming}
            onChange={(e) => onChange({ officerConfirming: e.target.value })}
          />
        </FormField>
        <FormField label="Type of journey">
          <select
            className="field-input w-full"
            value={leg.journeyType}
            onChange={(e) => onChange({ journeyType: e.target.value })}
          >
            <option value="">—</option>
            <option value="A/V">A/V — C.I.T.</option>
            <option value="S/S">S/S — Static / Courier</option>
          </select>
        </FormField>
      </div>
    </article>
  );
}
