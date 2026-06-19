"use client";

import { IconMapPin, IconPackage, IconTruckDelivery } from "@tabler/icons-react";

export function DeliveryHero() {
  return (
    <div className="delivery-hero" aria-hidden>
      <div className="delivery-hero-map">
        <svg viewBox="0 0 400 280" className="h-full w-full" fill="none" preserveAspectRatio="xMidYMid meet">
          <path
            d="M40 200 Q120 180 180 140 T340 80"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="40" cy="200" r="6" fill="#F5A623" />
          <circle cx="340" cy="80" r="6" fill="#2DD4BF" />
          <text x="28" y="220" fill="rgba(255,255,255,0.35)" fontSize="10">
            Nairobi
          </text>
          <text x="310" y="70" fill="rgba(255,255,255,0.35)" fontSize="10">
            Upcountry
          </text>
        </svg>

        <div className="delivery-hero-truck delivery-hero-truck-1">
          <IconTruckDelivery size={24} className="text-accent xs:hidden" />
          <IconTruckDelivery size={28} className="hidden text-accent xs:block" />
        </div>
        <div className="delivery-hero-truck delivery-hero-truck-2">
          <IconTruckDelivery size={18} className="text-teal opacity-80 xs:hidden" />
          <IconTruckDelivery size={22} className="hidden text-teal opacity-80 xs:block" />
        </div>
      </div>

      <div className="delivery-hero-cards">
        <div className="delivery-hero-card delivery-hero-card-float-1">
          <IconPackage size={16} className="shrink-0 text-accent xs:hidden" />
          <IconPackage size={18} className="hidden shrink-0 text-accent xs:block" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">In transit</p>
            <p className="truncate text-xs font-semibold text-white xs:text-sm">Local deliveries</p>
          </div>
        </div>
        <div className="delivery-hero-card delivery-hero-card-float-2">
          <IconMapPin size={16} className="shrink-0 text-teal xs:hidden" />
          <IconMapPin size={18} className="hidden shrink-0 text-teal xs:block" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Routes</p>
            <p className="truncate text-xs font-semibold text-white xs:text-sm">40+ destinations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
