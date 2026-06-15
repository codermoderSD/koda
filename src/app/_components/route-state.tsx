"use client";

import { usePathname } from "next/navigation";

export function RouteLoading() {
  const pathname = usePathname();
  const skeleton = loadingSkeletonFor(pathname);

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0">
      <header className="space-y-2">
        <Pulse className="h-2.5 w-20" />
        <Pulse className="h-7 w-64 max-w-[70%]" />
      </header>
      <div className="lg:min-h-0 lg:flex-1">{skeleton.node}</div>
    </div>
  );
}

export function RouteError({
  title = "KODA hit a runtime error",
  detail = "Something failed while loading this surface.",
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-danger)]" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[var(--color-text)]">
              {title}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">
              {detail}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function loadingSkeletonFor(pathname: string | null) {
  if (pathname?.startsWith("/calendar")) {
    return {
      title: "Loading calendar",
      detail: "Preparing events and agenda...",
      node: <CalendarSkeleton />,
    };
  }
  if (pathname?.startsWith("/commitments")) {
    return {
      title: "Loading commitments",
      detail: "Organizing extracted promises...",
      node: <CommitmentsSkeleton />,
    };
  }
  if (pathname?.startsWith("/inbox")) {
    return {
      title: "Loading inbox",
      detail: "Syncing Gmail threads and calendar context...",
      node: <InboxSkeleton />,
    };
  }
  return {
    title: "Loading KODA",
    detail: "Preparing the workspace...",
    node: <DefaultSkeleton />,
  };
}

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded bg-[var(--color-panel-strong)] ${className}`.trim()}
    />
  );
}

function SkeletonFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_76%,transparent)] p-3 shadow-[var(--shadow-soft)]">
      {children}
    </div>
  );
}

/* Bordered pane with a faux header bar — mirrors the live workspace panes. */
function SkeletonPane({
  label,
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2.5">
        <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
          {label}
        </span>
        <Pulse className="h-4 w-12 rounded-[var(--radius-sm)]" />
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="grid min-h-[420px] gap-3 lg:grid-cols-[2fr_4fr_2.4fr]">
      <SkeletonPane label="Mail">
        <Pulse className="mb-3 h-8 w-full rounded-[var(--radius)]" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-start gap-3 py-1">
              <Pulse className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Pulse className="h-2.5 w-1/3" />
                  <Pulse className="h-2 w-8" />
                </div>
                <Pulse className="h-2.5 w-2/3" />
                <Pulse className="h-2 w-full" />
                <Pulse className="h-3 w-12 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonPane>

      <SkeletonPane label="Thread" className="hidden lg:flex">
        <Pulse className="h-3.5 w-2/3" />
        <Pulse className="mt-2 h-2.5 w-2/5" />
        <div className="mt-3 flex gap-1.5">
          <Pulse className="h-6 w-24 rounded-[var(--radius-sm)]" />
          <Pulse className="h-6 w-20 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
          <div className="flex items-center gap-2.5">
            <Pulse className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-2.5 w-1/3" />
              <Pulse className="h-2 w-1/4" />
            </div>
          </div>
          <Pulse className="mt-4 h-2.5 w-full" />
          <Pulse className="mt-2.5 h-2.5 w-11/12" />
          <Pulse className="mt-2.5 h-2.5 w-4/5" />
        </div>
        <div className="mt-3 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
          <Pulse className="h-2.5 w-16" />
          <Pulse className="mt-3 h-20 w-full rounded-[var(--radius-sm)]" />
        </div>
      </SkeletonPane>

      <SkeletonPane label="Calendar" className="hidden lg:flex">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            <Pulse key={index} className="h-12 rounded-[var(--radius)]" />
          ))}
        </div>
        <Pulse className="mt-4 h-2.5 w-20" />
        <div className="mt-3 space-y-2.5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <Pulse className="h-1.5 w-1.5 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Pulse className="h-2.5 w-3/4" />
                <Pulse className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonPane>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <SkeletonFrame>
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Pulse className="h-8 w-48" />
            <Pulse className="h-8 w-36" />
          </div>
          <div className="grid grid-cols-7 border-t border-l border-[var(--color-line)]">
            {Array.from({ length: 49 }, (_, index) => (
              <div
                key={index}
                className="h-14 border-r border-b border-[var(--color-line)] p-2"
              >
                {index % 13 === 0 && <Pulse className="h-5 w-full" />}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Pulse className="h-8 w-28" />
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-3"
            >
              <Pulse className="h-3 w-32" />
              <Pulse className="mt-3 h-2 w-20" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonFrame>
  );
}

function CommitmentsSkeleton() {
  return (
    <SkeletonFrame>
      <div className="grid min-h-[360px] gap-4 lg:grid-cols-2">
        {["Promised by me", "Waiting on others"].map((title) => (
          <div key={title} className="space-y-3">
            <div className="flex items-center justify-between">
              <Pulse className="h-5 w-36" />
              <Pulse className="h-7 w-16" />
            </div>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4"
              >
                <Pulse className="h-3 w-3/4" />
                <Pulse className="mt-4 h-2.5 w-full" />
                <Pulse className="mt-2 h-2.5 w-2/3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </SkeletonFrame>
  );
}

function DefaultSkeleton() {
  return (
    <SkeletonFrame>
      <div className="mx-auto max-w-md space-y-2 p-3">
        <Pulse className="h-2.5 w-2/3" />
        <Pulse className="h-2.5 w-full" />
        <Pulse className="h-2.5 w-4/5" />
      </div>
    </SkeletonFrame>
  );
}
