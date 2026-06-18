"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "koda:inbox-panes-v2";
const MIN_PCT = 16;
const MAX_PCT = 62;

export type PaneWidths = {
  mail: number;
  calendarOpen: number;
  calendarClosed: number;
};

const DEFAULTS: PaneWidths = {
  mail: 28.5,
  calendarOpen: 28.5,
  calendarClosed: 43,
};

function clamp(value: number) {
  if (Number.isNaN(value)) return MIN_PCT;
  return Math.min(MAX_PCT, Math.max(MIN_PCT, value));
}

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
    } catch (error) {
      void error;
    }
  }, []);

  const adjust = useCallback((key: keyof PaneWidths, deltaPct: number) => {
    setWidths((current) => {
      const next = { ...current, [key]: clamp(current[key] + deltaPct) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        void error;
      }
      return next;
    });
  }, []);

  return { widths, adjust };
}

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
