"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./button";

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-taupe focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-sand/60 aria-[invalid=true]:border-danger";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  errors?: string[];
};

export function Field({ label, name, hint, errors, id = name, ...input }: FieldProps) {
  const errorId = errors?.length ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={inputClass}
        {...input}
      />
      {hint && !errorId && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-xs text-danger">
          {errors![0]}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={buttonClass(variant, className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-lg px-3.5 py-2.5 text-sm ${error ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}
    >
      {error ?? message}
    </p>
  );
}
