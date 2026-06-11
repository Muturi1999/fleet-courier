"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { IconCircleCheck } from "@tabler/icons-react";

type ToastContextValue = {
  toast: (msg: string) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);

  const toast = useCallback((message: string) => {
    setMsg(message);
    setVisible(true);
    window.setTimeout(() => setVisible(false), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-fleet-md bg-navy px-4 py-3 text-[13px] font-medium text-white shadow-fleet transition-all duration-300 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <IconCircleCheck size={18} className="text-accent" />
        <span>{msg}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
