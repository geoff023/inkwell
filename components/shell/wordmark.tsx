import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-serif text-xl font-semibold tracking-tight text-ink">
      Inkwell
    </Link>
  );
}
