"use client";

import { useState } from "react";

export type PageScreen =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | { kind: "view"; id: string }
  | { kind: "vehicle"; plate: string };

export function usePageScreen() {
  const [screen, setScreen] = useState<PageScreen>({ kind: "list" });

  return {
    screen,
    isList: screen.kind === "list",
    openCreate: () => setScreen({ kind: "create" }),
    openEdit: (id: string) => setScreen({ kind: "edit", id }),
    openView: (id: string) => setScreen({ kind: "view", id }),
    openVehicle: (plate: string) => setScreen({ kind: "vehicle", plate }),
    close: () => setScreen({ kind: "list" }),
  };
}
