"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { workspaceNav } from "./mock-data";

export function ShellNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {workspaceNav.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[13px] transition ${
              active
                ? "bg-[var(--color-panel-strong)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
            }`}
          >
            <span
              className={`absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--color-accent)] transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
            <span className="font-mono text-[10px] text-[var(--color-text-soft)]">
              {item.short}
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
