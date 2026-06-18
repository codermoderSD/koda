"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Purpose = "credits" | "product" | "feedback";

const PROMPT_COUNT_KEY = "koda:prompt-count";
const FEEDBACK_ASKED_KEY = "koda:feedback-asked";
const FEEDBACK_AFTER = 3;

const COPY: Record<
  Purpose,
  { title: string; placeholder: string; cta: string }
> = {
  credits: {
    title: "Need more credits?",
    placeholder: "Tell us how many credits you need and what for…",
    cta: "Request credits",
  },
  product: {
    title: "Ask about KODA",
    placeholder: "What would you like to know about the product?",
    cta: "Send enquiry",
  },
  feedback: {
    title: "How is KODA working for you?",
    placeholder: "What's working, what's missing, what would you change?",
    cta: "Send feedback",
  },
};

const TABS: Array<{ value: Purpose; label: string }> = [
  { value: "credits", label: "More credits" },
  { value: "product", label: "Product" },
  { value: "feedback", label: "Feedback" },
];

export function EnquiryTrigger() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("koda:open-enquiry", {
            detail: { purpose: "credits" },
          }),
        )
      }
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
        <path d="M2.5 4.5h11v7h-6l-3 2.5v-2.5h-2z" />
      </svg>
      Request credits / contact
    </button>
  );
}

export function EnquiryDialog() {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>("credits");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const openWith = useCallback((next: Purpose) => {
    setPurpose(next);
    setMessage("");
    setStatus("idle");
    setOpen(true);
  }, []);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ purpose?: Purpose }>).detail;
      openWith(detail?.purpose ?? "credits");
    }
    window.addEventListener("koda:open-enquiry", onOpen);
    return () => window.removeEventListener("koda:open-enquiry", onOpen);
  }, [openWith]);

  useEffect(() => {
    function onUsed() {
      try {
        if (localStorage.getItem(FEEDBACK_ASKED_KEY)) return;
        const count = Number(localStorage.getItem(PROMPT_COUNT_KEY) ?? "0") + 1;
        localStorage.setItem(PROMPT_COUNT_KEY, String(count));
        if (count >= FEEDBACK_AFTER) {
          localStorage.setItem(FEEDBACK_ASKED_KEY, "1");
          openWith("feedback");
        }
      } catch (error) {
        void error;
      }
    }
    window.addEventListener("koda:ai-used", onUsed);
    return () => window.removeEventListener("koda:ai-used", onUsed);
  }, [openWith]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  async function send() {
    if (!message.trim() || busy) return;
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/koda/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: purpose, message }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setMessage("");
      window.setTimeout(close, 1200);
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const copy = COPY[purpose];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
      />
      <div className="pop relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line-strong)] bg-[var(--color-panel-elevated)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kicker text-[var(--color-accent)]">Get in touch</p>
            <h2 className="mt-1 text-[16px] font-medium tracking-tight text-[var(--color-text)]">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-text)]"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPurpose(tab.value)}
              className={`rounded-[var(--radius-sm)] border px-2 py-1.5 text-[12px] font-medium transition ${
                purpose === tab.value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-line)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder={copy.placeholder}
          className="mt-3 w-full resize-none rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] focus:border-[var(--color-accent)]"
        />

        {status === "sent" ? (
          <p className="mt-3 text-[13px] text-[var(--color-success)]">
            Sent, thanks! We&apos;ll be in touch.
          </p>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3">
            {status === "error" ? (
              <p className="text-[12px] text-[var(--color-danger)]">
                Could not send. Try again.
              </p>
            ) : (
              <span className="text-[11px] text-[var(--color-text-soft)]">
                Sent to the KODA team
              </span>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !message.trim()}
              className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {busy ? "Sending…" : copy.cta}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
