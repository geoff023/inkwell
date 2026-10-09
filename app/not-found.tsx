import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-reading flex-1 flex-col justify-center px-4 py-24">
      <p className="text-xs font-medium tracking-[0.2em] text-taupe uppercase">Not found</p>
      <h1 className="mt-4 font-serif text-3xl">This page isn&apos;t here.</h1>
      <p className="mt-3 text-muted">It may have been moved, made private, or never written at all.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/discover" className={buttonClass("primary")}>
          Discover writing
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Go home
        </Link>
      </div>
    </main>
  );
}
