"use client";

import { useId, useRef, type ReactNode } from "react";
import { buttonClass } from "./button";
import { SubmitButton } from "./form";

/**
 * A trigger button plus a native <dialog> asking for confirmation. The
 * confirm button submits `action` with the given hidden fields.
 */
export function ConfirmDialog({
  trigger,
  triggerClassName,
  title,
  description,
  confirmLabel,
  pendingLabel,
  action,
  fields,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  action: (fd: FormData) => void | Promise<void>;
  fields: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={triggerClassName}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-white p-6 text-ink backdrop:bg-ink/30"
      >
        <h2 id={titleId} className="font-serif text-xl">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>
        <form action={action} className="mt-6 flex justify-end gap-2">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button type="button" autoFocus onClick={() => ref.current?.close()} className={buttonClass("secondary")}>
            Cancel
          </button>
          <SubmitButton variant="danger" pendingLabel={pendingLabel}>
            {confirmLabel}
          </SubmitButton>
        </form>
      </dialog>
    </>
  );
}
