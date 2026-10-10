"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { initialFormState } from "@/lib/forms/state";
import { INTERESTS } from "@/lib/validation/profile";
import { deleteAccount, updateProfile } from "./actions";

type ProfileValues = { displayName: string; username: string; bio: string; interests: string[] };

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const v = { ...initial, ...state.values };
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state.error} message={state.message} />
      <Field label="Display name" name="displayName" required maxLength={60} defaultValue={v.displayName} errors={state.fieldErrors?.displayName} />
      <Field
        label="Username"
        name="username"
        required
        maxLength={30}
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={v.username}
        errors={state.fieldErrors?.username}
        hint="Changing it changes your profile address, and old links to it stop working."
      />
      <div className="space-y-1.5">
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="bio" name="bio" rows={3} maxLength={280} defaultValue={v.bio} className={inputClass} />
        {state.fieldErrors?.bio && <p className="text-xs text-danger">{state.fieldErrors.bio[0]}</p>}
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Interests</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map(({ slug, label }) => (
            <label key={slug} className="cursor-pointer">
              <input type="checkbox" name="interests" value={slug} defaultChecked={initial.interests.includes(slug)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-taupe">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action] = useActionState(deleteAccount, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state.error} />
      <Field
        label={`Type ${username} to confirm`}
        name="confirm"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton variant="danger" pendingLabel="Deleting…">
        Delete my account
      </SubmitButton>
    </form>
  );
}
