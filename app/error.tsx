"use client";

import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-reading flex-1 flex-col justify-center px-4 py-24">
      <h1 className="font-serif text-3xl">Something went wrong.</h1>
      <p className="mt-3 text-muted">We couldn&apos;t load this page. Your saved writing is safe.</p>
      <button type="button" onClick={reset} className={buttonClass("primary", "mt-8 self-start")}>
        Try again
      </button>
    </main>
  );
}
