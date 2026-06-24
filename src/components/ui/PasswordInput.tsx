"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

export function PasswordInput({
  value,
  onChange,
  placeholder,
  minLength,
  required,
  autoComplete,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`field-input pr-12 ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-fleet-sm text-fleet-gray-400 hover:bg-fleet-gray-50 hover:text-fleet-gray-600"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
