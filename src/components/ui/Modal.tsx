"use client";

import { IconX } from "@tabler/icons-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  document,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  document?: boolean;
}) {
  if (!open) return null;

  const sizeClass = document ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-fleet bg-white p-6 shadow-fleet ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-fleet-sm border border-fleet-gray-100 bg-fleet-gray-50 text-fleet-gray-400"
            onClick={onClose}
          >
            <IconX size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-fleet-gray-600">{label}</label>
      {children}
    </div>
  );
}

export function FormActions({
  onCancel,
  submitLabel = "Save",
}: {
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="mt-5 flex gap-2">
      <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="btn-accent flex-[2]">
        {submitLabel}
      </button>
    </div>
  );
}
