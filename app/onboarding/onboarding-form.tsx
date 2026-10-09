"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { initialFormState } from "@/lib/forms/state";
import { INTERESTS } from "@/lib/validation/profile";
import { completeOnboarding } from "./actions";

export function OnboardingForm({ selected }: { selected: string[] }) {
  const [state, action, pending] = useActionState(completeOnboarding, initialFormState);
  return (
    <form action={action} className="space-y-8">
      <FormMessage error={state.error} />
      <fieldset>
        <legend className="text-sm font-medium">What do you like to read and write about? (optional)</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {INTERESTS.map(({ slug, label }) => (
            <label key={slug} className="cursor-pointer">
              <input type="checkbox" name="interests" value={slug} defaultChecked={selected.includes(slug)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-line bg-white px-4 py-2 text-sm text-muted peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-taupe">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="then" value="write" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Write my first entry"}
        </button>
        <button type="submit" name="then" value="home" disabled={pending} className={buttonClass("secondary")}>
          Take me home
        </button>
      </div>
    </form>
  );
}
