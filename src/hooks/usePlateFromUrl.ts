"use client";

import { useEffect } from "react";
import type { FleetFilters } from "@/lib/filters";

export function usePlateFromUrl(setFilters: (fn: (f: FleetFilters) => FleetFilters) => void) {
  useEffect(() => {
    const plate = new URLSearchParams(window.location.search).get("plate");
    if (plate) {
      setFilters((f) => ({ ...f, search: plate }));
    }
  }, [setFilters]);
}
