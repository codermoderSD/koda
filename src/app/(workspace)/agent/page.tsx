import { agentMessages } from "../_components/mock-data";

export default function AgentPage() {
  return (
    <div className="flex w-full flex-col gap-5 lg:h-full lg:min-h-0">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Agent</p>
          <h1 className="mt-1.5 text-xl font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
            Execution console
          </h1>
        </div>
        <p className="hidden max-w-sm text-right text-[13px] leading-6 text-[var(--color-text-soft)] md:block">
          An execution agent, not a chatbot. It acts across Gmail and Calendar,
          confirms once, and reports short.
        </p>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] lg:min-h-0">
          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {agentMessages.map((message, index) => {
              const isAgent = message.role === "assistant";
              return (
                <div key={`${message.role}-${index}`} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-mono text-[10px] ${
                      isAgent
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-3)] text-[var(--color-text-soft)]"
                    }`}
                  >
                    {isAgent ? "K" : "SH"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-text-soft)] uppercase">
                      {isAgent ? "KODA" : "You"}
                    </p>
                    <p
                      className={`mt-1 text-[14px] leading-7 ${
                        isAgent
                          ? "text-[var(--color-text)]"
                          : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {message.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--color-line)] p-3">
            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3.5 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-text-soft)]">
                Ask about commitments, overdue work, or a calendar action…
              </span>
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[11px] text-white transition hover:bg-[var(--color-accent-strong)]"
              >
                ↵ Run
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">Recent actions</p>
            <div className="mt-3 space-y-1.5">
              {[
                ["Drafted Northwind follow-up", "var(--color-success)"],
                ["Booked Fri 9:30 review block", "var(--color-success)"],
                ["Scheduled travel-budget nudge", "var(--color-warning)"],
              ].map(([label, color]) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-[13px] text-[var(--color-text-muted)]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <p className="kicker">How it behaves</p>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-5 text-[var(--color-text-muted)]">
              {[
                "Reads mailbox and calendar context before acting.",
                "Confirms external or destructive actions once.",
                "Returns short completion states, not essays.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-soft)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
