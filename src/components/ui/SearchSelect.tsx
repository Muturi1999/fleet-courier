"use client";

type Option = { value: string; label?: string };

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  required,
  className = "",
  listId,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  listId: string;
  mono?: boolean;
}) {
  const id = listId;
  return (
    <>
      <input
        list={id}
        className={`field-input ${mono ? "font-mono" : ""} ${className}`}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </datalist>
    </>
  );
}
