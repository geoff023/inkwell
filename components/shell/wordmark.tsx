import Link from "next/link";

/** A single drop of ink: the brand mark, and the whole logo when space is tight. */
export function InkMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M12 2.75c-.4.55-6.75 8.2-6.75 12.5a6.75 6.75 0 0 0 13.5 0C18.75 10.95 12.4 3.3 12 2.75Z" fill="currentColor" />
      <path d="M9.1 14.6c-.1 1.6.75 3 2.1 3.55" fill="none" stroke="var(--color-paper)" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ href = "/", hideTextClassName = "" }: { href?: string; hideTextClassName?: string }) {
  return (
    <Link href={href} aria-label="Inkwell" className="inline-flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-ink">
      <InkMark className="size-5 shrink-0 text-ink" />
      <span aria-hidden className={hideTextClassName}>
        Inkwell
      </span>
    </Link>
  );
}
