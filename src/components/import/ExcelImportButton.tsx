"use client";

import { useRef, useState } from "react";
import { IconUpload } from "@tabler/icons-react";

type ExcelImportButtonProps = {
  label?: string;
  onImport: (file: File) => Promise<void>;
  disabled?: boolean;
};

export function ExcelImportButton({
  label = "Import Excel",
  onImport,
  disabled,
}: ExcelImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await onImport(file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={14} />
        {busy ? "Importing…" : label}
      </button>
    </>
  );
}
