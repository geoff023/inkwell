import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Start writing" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-serif text-3xl">Start your collection</h1>
      <p className="mt-2 mb-8 text-muted">Everything you write starts private. You decide what to share.</p>
      <SignupForm />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
