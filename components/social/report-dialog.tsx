"use client";

import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { fileReport } from "@/lib/posts/actions";

const REASONS = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hateful content"],
  ["self_harm", "Self-harm or suicide"],
  ["sexual", "Sexual content"],
  ["other", "Something else"],
] as const;

export function ReportDialog({
  target,
  targetId,
  label,
  signedIn,
}: {
  target: "entry" | "comment" | "profile";
  targetId: string;
  label: string;
  signedIn: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<{ error?: string; done?: boolean }>({});
  const [pending, start] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await fileReport({
        target,
        targetId,
        reason: String(fd.get("reason")) as (typeof REASONS)[number][0],
        details: String(fd.get("details") ?? ""),
      });
      setState(res.ok ? { done: true } : { error: res.message });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (signedIn ? (setState({}), ref.current?.showModal()) : router.push(`/login?next=${encodeURIComponent(pathname)}`))}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted hover:bg-paper-soft hover:text-ink"
      >
        <Flag aria-hidden className="size-3.5" /> Report<span className="sr-only"> {label}</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`report-${targetId}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-6 text-ink backdrop:bg-ink/30"
      >
        <h2 id={`report-${targetId}`} className="font-serif text-xl">
          Report {label}
        </h2>
        {state.done ? (
          <>
            <p className="mt-3 text-sm text-muted">Thank you. We&apos;ll review this report.</p>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => ref.current?.close()} className={buttonClass("primary")}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm text-muted">What&apos;s wrong?</legend>
              {REASONS.map(([value, text], i) => (
                <label key={value} className="flex items-center gap-2.5 text-sm">
                  <input type="radio" name="reason" value={value} required defaultChecked={i === 0} className="accent-ink" />
                  {text}
                </label>
              ))}
            </fieldset>
            <div className="space-y-1.5">
              <label htmlFor={`report-details-${targetId}`} className="text-sm">
                Details <span className="text-muted">(optional)</span>
              </label>
              <textarea
                id={`report-details-${targetId}`}
                name="details"
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-taupe focus:outline-none"
              />
            </div>
            <FormMessage error={state.error} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => ref.current?.close()} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={pending} className={buttonClass("primary")}>
                {pending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
