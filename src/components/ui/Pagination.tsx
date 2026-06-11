"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-fleet border border-fleet-gray-100 bg-white px-4 py-2.5 text-xs text-fleet-gray-500">
      <span>
        Showing <span className="font-medium text-fleet-gray-800">{from}–{to}</span> of{" "}
        <span className="font-medium text-fleet-gray-800">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary btn-sm !px-2"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft size={16} />
        </button>
        <span className="min-w-[80px] text-center font-medium text-fleet-gray-700">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary btn-sm !px-2"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
