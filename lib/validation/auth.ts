import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 lowercase letters, numbers or underscores.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Tell readers what to call you.")
  .max(60, "Keep it under 60 characters.");

const email = z.email("Enter a valid email address.").trim().toLowerCase();
// 72 bytes is bcrypt's limit, which Supabase Auth uses.
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters.");

export const signUpSchema = z.object({ displayName: displayNameSchema, username: usernameSchema, email, password });
export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

/** Only allow same-site relative redirects, so `?next=` can't send users elsewhere. */
export function safeNextPath(next: unknown, fallback = "/home"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
