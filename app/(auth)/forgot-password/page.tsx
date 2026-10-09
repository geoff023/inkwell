import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-3xl">Forgot your password?</h1>
      <p className="mt-2 mb-8 text-muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/login" className="text-ink underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </>
  );
}
