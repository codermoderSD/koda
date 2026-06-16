"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "koda:inbox-panes-v2";
const MIN_PCT = 16;
const MAX_PCT = 62;

// Mail % + calendar % are tracked; the remaining pane is the flex-1 fill.
// Defaults match the target ratios: 2:3:2 with a thread open, 4:3 without.
export type PaneWidths = {
  mail: number; // mail width when thread is open (closed → mail is flex-1)
  calendarOpen: number; // calendar width when thread is open
  calendarClosed: number; // calendar width when thread is closed
};

const DEFAULTS: PaneWidths = {
  mail: 28.5, // 2 / 7
  calendarOpen: 28.5, // 2 / 7  → thread fills ~3/7
  calendarClosed: 43, // 3 / 7  → mail fills ~4/7
};

function clamp(value: number) {
  if (Number.isNaN(value)) return MIN_PCT;
  return Math.min(MAX_PCT, Math.max(MIN_PCT, value));
}

/**
 * Pane widths as percentages of the inbox container, persisted to localStorage.
 * Reads storage in an effect to stay SSR-safe (no hydration mismatch).
 */
export function usePaneWidths() {
  const [widths, setWidths] = useState<PaneWidths>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PaneWidths>;
      setWidths((current) => ({
        mail: clamp(parsed.mail ?? current.mail),
        calendarOpen: clamp(parsed.calendarOpen ?? current.calendarOpen),
        calendarClosed: clamp(parsed.calendarClosed ?? current.calendarClosed),
      }));
    } catch {
      // ignore malformed storage
    }
  }, []);

  /** Apply a percentage delta to one pane, clamped and persisted. */
  const adjust = useCallback((key: keyof PaneWidths, deltaPct: number) => {
    setWidths((current) => {
      const next = { ...current, [key]: clamp(current[key] + deltaPct) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota / private-mode errors
      }
      return next;
    });
  }, []);

  return { widths, adjust };
}

/**
 * Thin draggable divider between two panes. Reports the raw horizontal pixel
 * delta of each pointer move; the parent converts it to a percentage against
 * the container width. Desktop only (hidden below lg, where panes stack).
 */
export function ResizeHandle({
  ariaLabel,
  onResize,
}: {
  ariaLabel: string;
  onResize: (deltaPx: number) => void;
}) {
  const lastX = useRef(0);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      lastX.current = event.clientX;

      function move(moveEvent: PointerEvent) {
        const delta = moveEvent.clientX - lastX.current;
        lastX.current = moveEvent.clientX;
        if (delta !== 0) onResize(delta);
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onResize],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      className="group relative hidden w-1.5 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch lg:flex"
    >
      <span className="h-full w-px bg-[var(--color-line)] transition-colors group-hover:bg-[var(--color-accent)]" />
    </div>
  );
}
