"use client";

import type { ReactNode } from "react";

export function EtimsIconAction({
  label,
  onClick,
  disabled,
  busy,
  accent,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`group etims-icon-action${accent ? " etims-icon-action-accent" : ""}`}
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
    >
      {busy ? (
        <span className="inline-block h-3.5 w-3.5 animate-pulse rounded-full bg-current opacity-40" />
      ) : (
        children
      )}
      <span className="etims-icon-tooltip" role="tooltip">
        {label}
      </span>
    </button>
  );
}

export function EtimsActionGroup({ children }: { children: ReactNode }) {
  return <div className="etims-action-group">{children}</div>;
}
