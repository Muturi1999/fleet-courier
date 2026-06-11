"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({
  role,
  children,
}: {
  role: "admin" | "client";
  children: React.ReactNode;
}) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar role={role} />
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-[900] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/50 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
          <div className="relative z-[901] h-full w-[min(280px,88vw)] animate-slideIn shadow-fleet">
            <Sidebar role={role} onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar role={role} onMenuClick={() => setMobileNav(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-7">{children}</main>
      </div>
    </div>
  );
}
