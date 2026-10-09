"use server";

import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { env } from "@/lib/env";
import { invalid, type FormState } from "@/lib/forms/state";
import { supabaseServer } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const values = { displayName: str(fd, "displayName"), username: str(fd, "username"), email: str(fd, "email") };
  const parsed = signUpSchema.safeParse({ ...values, password: str(fd, "password") });
  if (!parsed.success) return invalid(parsed.error, values);
  const { displayName, username, email, password } = parsed.data;

  const supabase = await supabaseServer();
  const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { fieldErrors: { username: ["That username is already taken."] }, values };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName },
      emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    // The profile trigger fails if someone claimed the username a moment ago.
    if (/database error saving new user/i.test(error.message)) {
      return { fieldErrors: { username: ["That username is already taken."] }, values };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: [error.message] }, values };
    return { error: friendlyAuthError(error.message), values };
  }
  // Supabase hides existing accounts by returning a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Try logging in instead.", values };
  }
  if (!data.session) {
    return { message: `Almost there. We sent a confirmation link to ${email}.` };
  }
  redirect("/onboarding");
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = signInSchema.safeParse({ ...values, password: str(fd, "password") });
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Please confirm your email first. Check your inbox for the link.", values };
    if (error.code === "invalid_credentials") return { error: "That email and password don't match.", values };
    return { error: friendlyAuthError(error.message), values };
  }
  redirect(safeNextPath(fd.get("next")));
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });
  if (error?.status === 429) return { error: "Too many requests. Please wait a minute and try again.", values };
  // Same answer whether or not the account exists, so emails can't be probed.
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await getUserId())) return { error: "Your reset link has expired. Request a new one." };
  const parsed = resetPasswordSchema.safeParse({ password: str(fd, "password"), confirm: str(fd, "confirm") });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error.message) };
  redirect("/home");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}

function friendlyAuthError(message: string) {
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  if (/fetch failed|network/i.test(message)) return "We couldn't reach the server. Check your connection and try again.";
  return message || "Something went wrong. Please try again.";
}
