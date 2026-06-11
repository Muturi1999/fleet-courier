import Link from "next/link";
import { IconArrowRight, IconShieldCheck, IconTruckDelivery } from "@tabler/icons-react";
import { DeliveryHero } from "@/components/landing/DeliveryHero";

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-fleet-sm bg-accent text-navy">
            <IconTruckDelivery size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Fleet Courier</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">Fleet Travel Ltd</p>
          </div>
        </div>
        <Link href="/login" className="btn-accent">
          Login <IconArrowRight size={16} />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 pb-12 pt-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">G4S Kenya Contract</p>
            <h1 className="mb-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
              Fleet courier billing &amp; operations
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/60">
              Manage schedules, invoices, rate cards, and delivery logs — with dedicated admin and client portals for your fleet operations.
            </p>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <IconShieldCheck size={16} className="text-teal" />
              KRA eTIMS compliant · VAT @ 16%
            </div>
          </div>

          <DeliveryHero />
        </div>
      </main>

      <footer className="border-t border-white/[0.08] px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-xs text-white/40 sm:flex-row sm:text-left">
          <p>© {year} Fleet Travel Ltd. All rights reserved.</p>
          <p>Nairobi, Kenya · Licensed courier &amp; fleet services</p>
        </div>
      </footer>
    </div>
  );
}
