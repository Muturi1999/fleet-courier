"use client";

import { FormField } from "@/components/ui/Modal";
import { WORK_TICKET_CONDITION_CHECKS } from "@/lib/work-ticket-meta";
import type { WorkTicketVehicleCondition } from "@/lib/types";

type WorkTicketConditionFormProps = {
  value: WorkTicketVehicleCondition;
  onChange: (patch: Partial<WorkTicketVehicleCondition>) => void;
};

export function WorkTicketConditionForm({ value, onChange }: WorkTicketConditionFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WORK_TICKET_CONDITION_CHECKS.map(({ key, label }) => (
        <FormField key={key} label={label}>
          <input
            className="field-input w-full"
            placeholder="e.g. OK, Empty, 28L"
            value={value[key]}
            onChange={(e) => onChange({ [key]: e.target.value })}
          />
        </FormField>
      ))}
    </div>
  );
}
