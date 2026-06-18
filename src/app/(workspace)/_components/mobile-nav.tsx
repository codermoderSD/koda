"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { workspaceNav } from "./mock-data";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-line)] bg-[var(--color-surface-2)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {workspaceNav.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
              active
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-soft)]"
            }`}
          >
            <span
              className={`font-mono text-[10px] ${
                active
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-soft)]"
              }`}
            >
              {item.short}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
