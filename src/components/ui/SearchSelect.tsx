"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type Option = { value: string; label?: string };

const ROW_HEIGHT_PX = 38;
const VISIBLE_ROWS = 7;

function optionText(option: Option): string {
  return option.label ?? option.value;
}

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
  const autoId = useId();
  const menuId = listId || autoId;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const text = optionText(o).toLowerCase();
      return text.includes(q) || o.value.toLowerCase().includes(q);
    });
  }, [options, value]);

  const close = useCallback(() => setOpen(false), []);

  const pick = useCallback(
    (option: Option) => {
      onChange(option.value);
      close();
      inputRef.current?.focus();
    },
    [close, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close, open]);

  useEffect(() => {
    setHighlight(0);
  }, [value, filtered.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.children[highlight] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && filtered[highlight]) {
      event.preventDefault();
      pick(filtered[highlight]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div ref={wrapperRef} className="search-select">
      <div className="search-select-input-wrap">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-autocomplete="list"
          className={`field-input search-select-input ${mono ? "font-mono" : ""} ${className}`}
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <IconChevronDown
          size={16}
          aria-hidden
          className={`search-select-chevron ${open ? "search-select-chevron-open" : ""}`}
        />
      </div>

      {open && (
        <div className="search-select-menu" style={{ maxHeight: ROW_HEIGHT_PX * VISIBLE_ROWS + 8 }}>
          {filtered.length === 0 ? (
            <p className="search-select-empty">No matches</p>
          ) : (
            <ul
              ref={listRef}
              id={menuId}
              role="listbox"
              className="search-select-list"
              style={{ maxHeight: ROW_HEIGHT_PX * VISIBLE_ROWS }}
            >
              {filtered.map((option, index) => {
                const text = optionText(option);
                const active = index === highlight;
                return (
                  <li
                    key={`${option.value}-${index}`}
                    role="option"
                    aria-selected={active}
                    className={active ? "search-select-option search-select-option-active" : "search-select-option"}
                    style={{ minHeight: ROW_HEIGHT_PX }}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(option);
                    }}
                  >
                    {text}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
