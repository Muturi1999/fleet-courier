import Link from "next/link";
import { IconArrowRight, IconRocket, IconShieldCheck, IconTruckDelivery } from "@tabler/icons-react";
import { DeliveryHero } from "@/components/landing/DeliveryHero";

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="landing-page flex min-h-[100dvh] min-h-screen flex-col overflow-x-hidden bg-navy">
      <header className="landing-header mx-auto w-full max-w-6xl px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] xs:px-5 sm:px-6 sm:pb-0 sm:pt-5">
        <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
          <div className="flex min-w-0 items-center gap-2.5 xs:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-fleet-sm bg-accent text-navy xs:h-10 xs:w-10">
              <IconTruckDelivery size={20} className="xs:hidden" />
              <IconTruckDelivery size={22} className="hidden xs:block" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Fleet Courier</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-white/40">
                by Fleet Travel Ltd
              </p>
            </div>
          </div>

          <nav
            className="flex w-full items-stretch gap-2 xs:w-auto xs:items-center xs:justify-end xs:gap-3"
            aria-label="Primary"
          >
            <Link
              href="/login"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-fleet-sm px-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white xs:min-h-0 xs:flex-none xs:px-0 xs:hover:bg-transparent"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="btn-accent inline-flex min-h-[44px] flex-1 justify-center px-3 text-xs xs:min-h-0 xs:flex-none xs:px-4 xs:text-[13px]"
            >
              Get started
              <IconRocket size={16} className="shrink-0" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-4 xs:px-5 sm:px-6 sm:pb-12 sm:pt-8 md:pt-10 lg:justify-center">
        <div className="grid w-full items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-14">
          <div className="order-2 min-w-0 md:order-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-accent xs:mb-3 xs:text-xs">
              Fleet operator platform
            </p>
            <h1 className="landing-title mb-3 text-[1.625rem] font-semibold leading-[1.15] text-white xs:mb-4 xs:text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Billing &amp; operations for courier fleets
            </h1>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-white/60 xs:mb-6 xs:text-base">
              Fleet operators run schedules, invoices, work tickets, and consolidated billing from
              one admin dashboard. Partners — like G4S for Road Network Transporters — approve and
              reconcile on a separate portal.
            </p>
            <div className="mb-6 rounded-fleet-sm border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-white/55 xs:mb-8 xs:px-4 xs:py-3 xs:text-sm">
              <span className="font-medium text-white/80">Live example:</span> Road Network
              Transporters manages fleet billing; G4S Kenya uses the partner portal to review and
              approve.
            </div>
            <div className="mb-6 flex flex-col gap-2.5 xs:mb-8 xs:flex-row xs:flex-wrap xs:gap-3">
              <Link
                href="/onboarding"
                className="btn-accent inline-flex min-h-[48px] w-full justify-center px-4 text-sm xs:min-h-[44px] xs:w-auto"
              >
                <span className="xs:hidden">Get started</span>
                <span className="hidden xs:inline sm:hidden">Start as operator</span>
                <span className="hidden sm:inline">Get started as fleet operator</span>
                <IconArrowRight size={16} className="shrink-0" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-fleet-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 xs:min-h-[44px] xs:w-auto"
              >
                Sign in (operator or partner)
              </Link>
            </div>
            <div className="flex items-start gap-2 text-xs leading-snug text-white/50 xs:text-sm">
              <IconShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" />
              <span>
                Isolated database per fleet operator · KRA eTIMS · VAT @ 16%
              </span>
            </div>
          </div>

          <div className="order-1 min-w-0 md:order-2">
            <DeliveryHero />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] xs:px-5 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center text-[11px] leading-relaxed text-white/40 xs:gap-3 xs:text-xs sm:flex-row sm:text-left">
          <p>© {year} Fleet Travel Ltd. All rights reserved.</p>
          <p>Nairobi, Kenya · Licensed courier &amp; fleet services</p>
        </div>
      </footer>
    </div>
  );
}
