"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export function CursorPagination({
  limit,
  count,
  hasMore,
  hasPrev,
  onNext,
  onPrev,
}: {
  limit: number;
  count: number;
  hasMore: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-fleet border border-fleet-gray-100 bg-white px-4 py-2.5 text-xs text-fleet-gray-500">
      <span>
        Showing <span className="font-medium text-fleet-gray-800">{count}</span> row{count === 1 ? "" : "s"}
        <span className="text-fleet-gray-400"> · {limit} per page</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary btn-sm !px-2"
          disabled={!hasPrev}
          onClick={onPrev}
          aria-label="Previous page"
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm !px-2"
          disabled={!hasMore}
          onClick={onNext}
          aria-label="Next page"
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
