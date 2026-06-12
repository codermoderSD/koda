import { commitmentColumns } from "../_components/mock-data";

function Lane({
  title,
  count,
  countLabel,
  children,
}: {
  title: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <h2 className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-text)] uppercase">
          {title}
        </h2>
        <span className="font-mono text-[11px] text-[var(--color-text-soft)]">
          {count} {countLabel}
        </span>
      </div>
      <div className="divide-y divide-[var(--color-line)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

export default function CommitmentsPage() {
  return (
    <div className="flex w-full flex-col gap-5 lg:h-full lg:min-h-0">
      <header>
        <p className="kicker">Commitments</p>
        <h1 className="mt-1.5 text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
          Who owes what
        </h1>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[1fr_1fr_280px]">
        <Lane
          title="Promised by me"
          count={commitmentColumns.mine.length}
          countLabel="active"
        >
          {commitmentColumns.mine.map((item) => (
            <article key={item.title} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-medium leading-5 text-[var(--color-text)]">
                  {item.title}
                </h3>
                <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-warning-soft)] px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-[var(--color-warning)]">
                  {item.due}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-[var(--color-text-soft)]">
                {item.detail}
              </p>
            </article>
          ))}
        </Lane>

        <Lane
          title="Waiting on others"
          count={commitmentColumns.waitingOn.length}
          countLabel="tracked"
        >
          {commitmentColumns.waitingOn.map((item) => {
            const overdue = item.due.toLowerCase().includes("overdue");
            return (
              <article key={item.title} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-medium leading-5 text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap ${
                      overdue
                        ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                        : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                    }`}
                  >
                    {item.due}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-5 text-[var(--color-text-soft)]">
                  {item.detail}
                </p>
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5 text-left text-[12px] text-[var(--color-text-muted)] transition hover:border-[var(--color-line-strong)] hover:text-[var(--color-text)]"
                >
                  Draft follow-up →
                </button>
              </article>
            );
          })}
        </Lane>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">This week</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["3", "due", "var(--color-text)"],
                ["1", "overdue", "var(--color-danger)"],
                ["1", "ready", "var(--color-success)"],
              ].map(([n, label, color]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-2.5 text-center"
                >
                  <p className="font-mono text-lg leading-none" style={{ color }}>
                    {n}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">How it works</p>
            <ol className="mt-3 space-y-3">
              {[
                "A thread implies a promise or request",
                "KODA extracts it with owner and deadline",
                "It stays tracked until a reply or event closes it",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-line-strong)] font-mono text-[9px] text-[var(--color-text-soft)]">
                    {index + 1}
                  </span>
                  <span className="text-[12px] leading-5 text-[var(--color-text-muted)]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
