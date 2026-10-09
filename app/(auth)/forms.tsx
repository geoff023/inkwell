"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { initialFormState } from "@/lib/forms/state";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton pendingLabel="Logging in…" className="w-full">
        Log in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, initialFormState);
  if (state.message) return <FormMessage message={state.message} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="Display name"
        name="displayName"
        autoComplete="name"
        required
        maxLength={60}
        defaultValue={state.values?.displayName}
        errors={state.fieldErrors?.displayName}
      />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={30}
        defaultValue={state.values?.username}
        errors={state.fieldErrors?.username}
        hint="Your profile lives at /u/username. Lowercase letters, numbers and underscores."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
        hint="Never shown to other people."
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
        hint="At least 8 characters."
      />
      <SubmitButton pendingLabel="Creating your account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={state.fieldErrors?.password}
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingLabel="Saving…" className="w-full">
        Set new password
      </SubmitButton>
    </form>
  );
}
