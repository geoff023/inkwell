"use client";

import { Globe, Lock, Save } from "lucide-react";
import { useState, type RefObject } from "react";
import { buttonClass } from "@/components/ui/button";
import { listCheckpoints, type Checkpoint } from "@/lib/entries/actions";
import { diff, formatDuration, signed } from "@/lib/entries/history";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const KIND = {
  save: { label: "Saved draft", icon: Save },
  publish: { label: "Published", icon: Globe },
  unpublish: { label: "Unpublished", icon: Lock },
} as const;

/** Lists save checkpoints. Call the returned `open` to load and show it. */
export function useHistoryPanel(entryId: string, dialogRef: RefObject<HTMLDialogElement | null>) {
  const [items, setItems] = useState<Checkpoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setError(null);
    dialogRef.current?.showModal();
    try {
      const res = await listCheckpoints(entryId);
      if (res.ok) setItems(res.items);
      else setError(res.message);
    } catch {
      setError("Couldn't load the history.");
    }
  };
  return { items, error, open };
}

export function HistoryPanel({
  dialogRef,
  items,
  error,
  totalSeconds,
  words,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  items: Checkpoint[] | null;
  error: string | null;
  totalSeconds: number;
  words: number;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="history-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-paper p-0 text-ink backdrop:bg-ink/30"
    >
      <div className="p-6 sm:p-8">
        <h2 id="history-title" className="font-serif text-2xl">
          History
        </h2>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-white/70 p-4">
            <dt className="text-xs text-muted">Time spent writing</dt>
            <dd className="mt-1 font-serif text-2xl">{formatDuration(totalSeconds)}</dd>
          </div>
          <div className="rounded-xl border border-line bg-white/70 p-4">
            <dt className="text-xs text-muted">Words now</dt>
            <dd className="mt-1 font-serif text-2xl">{words.toLocaleString("en")}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">Time counts while you type; pauses longer than 30 seconds aren&apos;t included.</p>

        <h3 className="mt-8 text-xs font-medium tracking-[0.15em] text-taupe uppercase">Saves</h3>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : items === null ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No saves yet. Use “Save draft” to mark a point in your writing.</p>
        ) : (
          <ol className="mt-3 divide-y divide-line">
            {items.map((item, i) => {
              const change = diff(item, items[i + 1]);
              const { label, icon: Icon } = KIND[item.kind];
              return (
                <li key={item.id} className="flex gap-3 py-3.5">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-taupe" strokeWidth={1.8} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium">{label}</span>
                      <time dateTime={item.created_at} className="text-xs text-muted">
                        {when.format(new Date(item.created_at))}
                      </time>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      <span className={change.words > 0 ? "text-success" : change.words < 0 ? "text-danger" : ""}>{signed(change.words, "word")}</span>
                      {change.words === 0 && change.chars !== 0 && <> · {signed(change.chars, "character")}</>}
                      {change.titleChanged && <> · title changed</>}
                      {change.seconds > 0 && <> · {formatDuration(change.seconds)} writing</>}
                      {" · "}
                      {item.word_count.toLocaleString("en")} total
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClass("secondary")}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
