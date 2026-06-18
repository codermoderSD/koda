"use client";

import { usePathname } from "next/navigation";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function RouteLoading() {
  const pathname = usePathname();

  return (
    <SkeletonTheme
      baseColor="var(--color-panel-strong)"
      highlightColor="var(--color-surface-3)"
      borderRadius="var(--radius)"
      duration={1.4}
    >
      <div className="flex w-full flex-col gap-6 lg:h-full lg:min-h-0">
        <header className="space-y-2">
          <Skeleton width={72} height={9} />
          <Skeleton width={240} height={24} />
        </header>
        <div className="lg:min-h-0 lg:flex-1">{skeletonFor(pathname)}</div>
      </div>
    </SkeletonTheme>
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

function skeletonFor(pathname: string | null) {
  if (pathname?.startsWith("/calendar")) return <CalendarSkeleton />;
  if (pathname?.startsWith("/commitments")) return <CommitmentsSkeleton />;
  if (pathname?.startsWith("/inbox")) return <InboxSkeleton />;
  return <ListSkeleton rows={4} />;
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="32%" height={11} />
          <Skeleton width="80%" height={11} />
        </div>
      ))}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_4fr_2.4fr]">
      <ListSkeleton rows={6} />
      <div className="hidden space-y-4 lg:block">
        <Skeleton width="60%" height={16} />
        <Skeleton count={5} height={11} />
      </div>
      <div className="hidden lg:block">
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <Skeleton height={360} />
      <div className="hidden lg:block">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}

function CommitmentsSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ListSkeleton rows={3} />
      <ListSkeleton rows={3} />
    </div>
  );
}
