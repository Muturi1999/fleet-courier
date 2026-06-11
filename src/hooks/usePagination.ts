"use client";

import { useEffect, useMemo, useState } from "react";
import { PAGE_SIZE } from "@/lib/filters";

export function usePagination<T>(items: T[], resetKey = "", pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    page: safePage,
    setPage,
    totalPages,
    paginated,
    total: items.length,
    pageSize,
    from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, items.length),
  };
}
