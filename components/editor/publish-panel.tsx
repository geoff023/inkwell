"use client";

import { Globe, Lock } from "lucide-react";
import { useState, useTransition, type RefObject } from "react";
import { EntryBody } from "@/components/entries/entry-body";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import type { DocNode } from "@/lib/content";
import { updatePublication } from "@/lib/entries/actions";
import { MAX_TAGS } from "@/lib/validation/entry";

export type PublishPanelProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  entryId: string;
  isPublic: boolean;
  tags: string[];
  preview: { title: string; content: DocNode } | null;
  /** Saves pending edits first; resolves false if that failed. */
  beforeSubmit: () => Promise<boolean>;
  onDone: (result: { revision: number; isPublic: boolean; tags: string[] }) => void;
};

export function PublishPanel({ dialogRef, entryId, isPublic, tags, preview, beforeSubmit, onDone }: PublishPanelProps) {
  const [makePublic, setMakePublic] = useState(true);
  const [tagText, setTagText] = useState(tags.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => dialogRef.current?.close();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      if (!(await beforeSubmit())) {
        setError("Your latest changes aren't saved yet, so nothing was published. Try again in a moment.");
        return;
      }
      const tagList = tagText.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await updatePublication({ id: entryId, tags: tagList, makePublic });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      onDone({ revision: res.revision, isPublic: makePublic, tags: tagList });
      close();
    });

  const option = (value: boolean, Icon: typeof Lock, label: string, hint: string) => (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line bg-white p-4 has-checked:border-ink">
      <input
        type="radio"
        name="visibility"
        checked={makePublic === value}
        onChange={() => setMakePublic(value)}
        className="mt-1 accent-ink"
      />
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          <Icon aria-hidden className="size-4" /> {label}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="publish-title"
      onClose={() => setError(null)}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper p-0 text-ink backdrop:bg-ink/30"
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <h2 id="publish-title" className="font-serif text-2xl">
            {isPublic ? "Publication settings" : "Ready to share?"}
          </h2>
          <p className="mt-1 text-sm text-muted">You can change this at any time.</p>
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Visibility</legend>
          {option(true, Globe, "Public", "Anyone can read it. Signed-in readers can like and comment.")}
          {option(false, Lock, "Private", isPublic ? "Unpublish. Only you will be able to see it." : "Keep it in your journal, just for you.")}
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="publish-tags" className="block text-sm font-medium">
            Topics <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="publish-tags"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="memories, poetry"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 focus:border-taupe focus:outline-none"
          />
          <p className="text-xs text-muted">Separate with commas. Up to {MAX_TAGS}.</p>
        </div>

        {preview && makePublic && (
          <section aria-label="Preview" className="rounded-xl border border-line bg-white px-5 py-6 sm:px-8">
            <p className="mb-4 text-xs font-medium tracking-[0.15em] text-taupe uppercase">Preview</p>
            {preview.title && <h3 className="mb-4 font-serif text-2xl">{preview.title}</h3>}
            <EntryBody doc={preview.content} />
          </section>
        )}

        <FormMessage error={error ?? undefined} />

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={close} className={buttonClass("secondary")}>
            Back to editing
          </button>
          <button type="button" onClick={submit} disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : makePublic ? (isPublic ? "Update" : "Publish") : isPublic ? "Unpublish" : "Keep private"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
