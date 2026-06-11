"use client";

import { IconArrowLeft, IconChevronRight } from "@tabler/icons-react";

export type Breadcrumb = { label: string; onClick?: () => void };

export function RecordScreen({
  crumbs,
  title,
  onBack,
  children,
}: {
  crumbs: Breadcrumb[];
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="record-screen">
      <div className="record-screen-header">
        <nav className="record-breadcrumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <IconChevronRight size={12} className="text-fleet-gray-300" aria-hidden />}
              {c.onClick ? (
                <button type="button" className="record-crumb-link" onClick={c.onClick}>{c.label}</button>
              ) : (
                <span className="record-crumb-current">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
            <IconArrowLeft size={16} /> Back
          </button>
          <h2 className="text-lg font-semibold text-fleet-gray-800">{title}</h2>
        </div>
      </div>
      <div className="record-screen-body">{children}</div>
    </div>
  );
}
