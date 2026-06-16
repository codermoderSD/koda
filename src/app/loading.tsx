import { KodaLogo } from "./_components/koda-logo";

export default function Loading() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="aurora" aria-hidden />
      <div className="relative flex h-12 w-12 items-center justify-center">
        {/* Spinning accent ring */}
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
        <span className="float">
          <KodaLogo markClassName="h-6 w-6" />
        </span>
      </div>
      <p className="animate-pulse font-mono text-[11px] tracking-[0.18em] text-[var(--color-text-soft)] uppercase">
        Loading KODA
      </p>
    </div>
  );
}
