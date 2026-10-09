"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";

const KEY = "inkwell:prompt-dismissed";

/** Today's prompt. Dismissing hides it until tomorrow's prompt (per browser). */
export function PromptCard({ prompt, index }: { prompt: string; index: number }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      // Sync with a per-browser preference once mounted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY) === prompt) setHidden(true);
    } catch {
      // Storage unavailable: just show the prompt.
    }
  }, [prompt]);

  if (hidden) return null;
  return (
    <section aria-label="Writing prompt" className="relative rounded-2xl border border-line bg-white/70 p-6 sm:p-8">
      <p className="text-xs font-medium tracking-[0.2em] text-taupe uppercase">A prompt, if you want one</p>
      <p className="mt-3 pr-8 font-serif text-2xl leading-snug">{prompt}</p>
      <Link href={`/write?prompt=${index}`} className={buttonClass("primary", "mt-6")}>
        Write about this
      </Link>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, prompt);
          } catch {}
        }}
        className="absolute top-4 right-4 rounded-full p-2 text-muted hover:bg-paper-soft hover:text-ink"
      >
        <X aria-hidden className="size-4" />
        <span className="sr-only">Dismiss prompt</span>
      </button>
    </section>
  );
}
