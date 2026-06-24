"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";

type ToastVariant = "success" | "error";

type ToastContextValue = {
  toast: (msg: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState<ToastVariant>("success");
  const [visible, setVisible] = useState(false);

  const toast = useCallback((message: string, tone: ToastVariant = "success") => {
    setMsg(message);
    setVariant(tone);
    setVisible(true);
    window.setTimeout(() => setVisible(false), 3200);
  }, []);

  const Icon = variant === "error" ? IconCircleX : IconCircleCheck;
  const accent = variant === "error" ? "text-fleet-red" : "text-accent";

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className={`pointer-events-none fixed left-1/2 top-4 z-[9999] w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 rounded-fleet-md bg-navy px-4 py-3 text-[13px] font-medium text-white shadow-fleet">
          <Icon size={18} className={accent} />
          <span className="flex-1 text-center">{msg}</span>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
