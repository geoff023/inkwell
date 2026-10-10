"use client";

import { RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { PROMPT_CATEGORIES, PROMPTS, randomPromptIndex } from "@/lib/prompts";

const DISMISS_KEY = "inkwell:prompt-dismissed";
const CATEGORY_KEY = "inkwell:prompt-category";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: preferences just don't persist.
  }
}

/**
 * Prompt picker: choose a category (or any), draw another prompt, or write.
 * The first render uses the server's daily prompt; a remembered category and
 * dismissal are applied after mount.
 */
export function PromptCard({ initialIndex, today }: { initialIndex: number; today: string }) {
  const [index, setIndex] = useState(initialIndex);
  const [category, setCategory] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // The category row scrolls sideways; let a normal (vertical) mouse wheel
  // move it too. At either end the wheel goes back to scrolling the page.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 0) return;
      if ((e.deltaY < 0 && row.scrollLeft <= 0) || (e.deltaY > 0 && row.scrollLeft >= max - 1)) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, [hidden]);

  // Keep the chosen category visible, e.g. when it was restored on load.
  useEffect(() => {
    rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [category, hidden]);

  useEffect(() => {
    // Sync with per-browser preferences once mounted.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (read(DISMISS_KEY) === today) setHidden(true);
    const saved = read(CATEGORY_KEY);
    if (saved && PROMPT_CATEGORIES.includes(saved)) {
      setCategory(saved);
      if (PROMPTS[initialIndex]?.category !== saved) setIndex(randomPromptIndex(saved));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialIndex, today]);

  const choose = (next: string | null) => {
    setCategory(next);
    write(CATEGORY_KEY, next);
    if (next && PROMPTS[index]?.category === next) return;
    setIndex(randomPromptIndex(next, index));
  };

  if (hidden) {
    return (
      <button type="button" onClick={() => (setHidden(false), write(DISMISS_KEY, null))} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        Show a writing prompt
      </button>
    );
  }

  const prompt = PROMPTS[index];
  const chip =
    "shrink-0 rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";

  return (
    <section aria-labelledby="prompt-heading" className="relative rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 id="prompt-heading" className="pr-10 font-serif text-base text-muted italic">
        A prompt, if you want one
      </h2>

      <div
        ref={rowRef}
        role="group"
        aria-label="Prompt category"
        className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none]"
      >
        <button type="button" aria-pressed={category === null} onClick={() => choose(null)} className={chip}>
          Any
        </button>
        {PROMPT_CATEGORIES.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => choose(c)} className={chip}>
            {c}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-6 min-h-[4.5rem]">
        <span className="block text-xs text-muted">{prompt.category}</span>
        <span className="mt-1.5 block font-serif text-2xl leading-snug text-balance first-letter:uppercase sm:text-3xl">{prompt.title}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/write?prompt=${index}`} className={buttonClass("primary")}>
          Write about this
        </Link>
        <button type="button" onClick={() => setIndex(randomPromptIndex(category, index))} className={buttonClass("secondary")}>
          <RefreshCw aria-hidden className="size-4" /> Another prompt
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setHidden(true);
          write(DISMISS_KEY, today);
        }}
        className="absolute top-4 right-4 rounded-full p-2 text-muted hover:bg-paper-soft hover:text-ink"
      >
        <X aria-hidden className="size-4" />
        <span className="sr-only">Hide prompt for today</span>
      </button>
    </section>
  );
}
