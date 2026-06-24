"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

export type ExportFormat = "csv" | "xls";

export function ExportFormatModal({
  open,
  title,
  onClose,
  onConfirm,
  defaultFormat = "xls",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (format: ExportFormat) => void;
  defaultFormat?: ExportFormat;
}) {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);

  useEffect(() => {
    if (open) setFormat(defaultFormat);
  }, [open, defaultFormat]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-4 text-sm text-fleet-gray-500">Choose a file format to download.</p>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-fleet border border-fleet-gray-100 px-3 py-2.5 text-sm">
          <input
            type="radio"
            name="export-format"
            checked={format === "xls"}
            onChange={() => setFormat("xls")}
          />
          Excel (.xls)
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-fleet border border-fleet-gray-100 px-3 py-2.5 text-sm">
          <input
            type="radio"
            name="export-format"
            checked={format === "csv"}
            onChange={() => setFormat("csv")}
          />
          CSV (.csv)
        </label>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-accent flex-[2]" onClick={() => onConfirm(format)}>
          Download
        </button>
      </div>
    </Modal>
  );
}
