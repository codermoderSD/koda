"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
  message?: string;
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function DictationButton({
  value,
  onChange,
  onSubmit,
  disabled,
  className = "",
  overlayClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
  overlayClassName?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const finalRef = useRef("");
  const cancelledRef = useRef(false);
  const rootClassName =
    className.includes("absolute") || className.includes("fixed")
      ? `inline-flex ${className}`
      : `relative inline-flex ${className}`;

  useEffect(() => {
    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognition));

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!listening) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
      }
      if (event.key === "Enter" && !event.shiftKey && onSubmit) {
        event.preventDefault();
        stop();
        window.setTimeout(onSubmit, 0);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, onSubmit]);

  function renderText(nextInterim: string) {
    return [baseRef.current, finalRef.current, nextInterim]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function start() {
    setStatus(null);
    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice input is not available in this browser.");
      return;
    }

    recognitionRef.current?.abort();
    cancelledRef.current = false;
    baseRef.current = value.trim();
    finalRef.current = "";
    setInterim("");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => {
      setListening(true);
      setStatus(null);
    };
    recognition.onresult = (event) => {
      let nextInterim = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (!result) continue;
        const transcript = result[0]?.transcript.trim();
        if (!transcript) continue;
        if (result.isFinal) {
          finalRef.current = [finalRef.current, transcript]
            .filter(Boolean)
            .join(" ")
            .trim();
        } else {
          nextInterim = [nextInterim, transcript].filter(Boolean).join(" ");
        }
      }
      setInterim(nextInterim);
      onChange(renderText(nextInterim));
    };
    recognition.onerror = (event) => {
      setStatus(
        event.error === "not-allowed"
          ? "Microphone access was blocked."
          : "Could not capture voice input.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
      if (!cancelledRef.current && renderText("").trim()) {
        onChange(renderText(""));
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus("Voice input is already listening.");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  function cancel() {
    cancelledRef.current = true;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
    setStatus(null);
    onChange(baseRef.current);
  }

  return (
    <span className={rootClassName.trim()}>
      {(listening || status) && (
        <span
          className={`pop pointer-events-auto absolute right-0 bottom-[calc(100%+8px)] z-50 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-[20px] border border-[var(--color-line-strong)] bg-[color-mix(in_oklab,var(--color-panel-elevated)_90%,transparent)] px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur-xl ${overlayClassName}`.trim()}
        >
          <span className="absolute inset-0 overflow-hidden" aria-hidden>
            <span className="dictation-blob dictation-blob-a" />
            <span className="dictation-blob dictation-blob-b" />
            <span className="dictation-blob dictation-blob-c" />
          </span>
          <span className="relative flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                listening
                  ? "animate-pulse bg-[var(--color-danger)]"
                  : "bg-[var(--color-warning)]"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] text-[var(--color-text)]">
                {interim || status || "Listening..."}
              </span>
              {listening && (
                <span className="mt-0.5 block font-mono text-[9px] tracking-[0.08em] text-[var(--color-text-soft)] uppercase">
                  Esc to stop
                </span>
              )}
            </span>
            {listening && (
              <>
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-full bg-[var(--color-text)] px-2 py-1 text-[10px] font-medium text-[var(--color-surface)]"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  aria-label="Cancel dictation"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-text)]"
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
              </>
            )}
          </span>
        </span>
      )}

      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        aria-label={listening ? "Stop voice input" : "Start voice input"}
        title={
          supported
            ? listening
              ? "Stop voice input"
              : "Start voice input"
            : "Voice input is not available in this browser"
        }
        className={`tap relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border disabled:opacity-50 ${
          listening
            ? "ping-ring border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
            : "border-[var(--color-line)] text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
        }`}
      >
        {listening ? (
          <span className="h-2.5 w-2.5 rounded-[2px] bg-current" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>
    </span>
  );
}
