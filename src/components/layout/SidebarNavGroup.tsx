"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { WorkflowNavGroup } from "@/lib/workflow-nav";
import { workflowGroupActive } from "@/lib/workflow-nav";

export function SidebarNavGroup({
  item,
  icon: Icon,
  onNavigate,
  onPrefetch,
}: {
  item: WorkflowNavGroup;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onNavigate?: () => void;
  onPrefetch?: (href: string) => void;
}) {
  const pathname = usePathname();
  const groupActive = workflowGroupActive(pathname, item);
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  return (
    <div className="mb-0.5">
      <div className="flex items-stretch gap-0.5">
        <Link
          href={item.href}
          onClick={onNavigate}
          onMouseEnter={() => onPrefetch?.(item.href)}
          onFocus={() => onPrefetch?.(item.href)}
          className={`nav-item min-w-0 flex-1 ${pathname === item.href ? "nav-item-active" : groupActive ? "text-white/80" : ""}`}
        >
          <Icon size={17} className="w-5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${item.label} menu`}
          className={`mb-px flex w-8 shrink-0 items-center justify-center rounded-fleet-sm text-white/40 transition hover:bg-white/[0.07] hover:text-white/80 ${groupActive ? "text-white/60" : ""}`}
          onClick={() => setOpen((v) => !v)}
        >
          <IconChevronDown size={14} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="ml-7 border-l border-white/10 pl-1.5">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                onMouseEnter={() => onPrefetch?.(child.href)}
                onFocus={() => onPrefetch?.(child.href)}
                className={`nav-item nav-item-sub ${childActive ? "nav-item-active" : ""}`}
              >
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
