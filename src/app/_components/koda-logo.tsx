import Image from "next/image";

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
      <Image
        src="/icon.png"
        alt=""
        width={32}
        height={32}
        className={markClassName}
        aria-hidden="true"
      />
      {showWordmark && <span className={wordmarkClassName}>KODA</span>}
    </span>
  );
}
