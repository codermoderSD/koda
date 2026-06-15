type KodaLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function KodaLogo({
  className = "",
  markClassName = "h-7 w-7",
  showWordmark = false,
  wordmarkClassName = "text-[15px] font-medium tracking-tight",
}: KodaLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <svg
        viewBox="0 0 32 32"
        className={markClassName}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="koda-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-strong)" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="9"
          className="fill-[var(--color-text)]"
        />
        {/* Bold K — stem + upper arm carved from the tile */}
        <path
          d="M10.5 8.5h3.2v15h-3.2z"
          className="fill-[var(--color-surface)]"
        />
        <path
          d="M13 16.2 19.4 8.5h3.9l-6.7 7.8z"
          className="fill-[var(--color-surface)]"
        />
        {/* Lower leg in accent — the forward/execution stroke */}
        <path d="M13 15.8 23.8 23.5h-3.9L13 18.6z" fill="url(#koda-mark)" />
      </svg>
      {showWordmark && <span className={wordmarkClassName}>KODA</span>}
    </span>
  );
}
