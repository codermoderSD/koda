"use client";

import { useState } from "react";

type Kind = "credits" | "product";

export function EnquiryForm() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("credits");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function send() {
    if (!message.trim() || busy) return;
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/koda/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setMessage("");
      setTimeout(() => setOpen(false), 1400);
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
        }}
        className="tap flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-line)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-line-strong)] hover:text-[var(--color-text)]"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
        Request credits / contact
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-line-strong)] bg-[var(--color-panel)] p-3">
      <div className="flex items-center justify-between">
        <span className="kicker">Get in touch</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:text-[var(--color-text)]"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        {(
          [
            ["credits", "More credits"],
            ["product", "Product"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-[var(--radius-sm)] border px-2 py-1 text-[11px] font-medium transition ${
              kind === value
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-line)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={
          kind === "credits"
            ? "Tell us how many credits you need…"
            : "What would you like to know?"
        }
        className="mt-2 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-2 text-[12px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] focus:border-[var(--color-accent)]"
      />

      {status === "sent" ? (
        <p className="mt-2 text-[11px] text-[var(--color-success)]">
          Sent — thanks! We&apos;ll be in touch.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !message.trim()}
          className="mt-2 w-full rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      )}
      {status === "error" && (
        <p className="mt-1.5 text-[11px] text-[var(--color-danger)]">
          Could not send. Please try again.
        </p>
      )}
    </div>
  );
}
