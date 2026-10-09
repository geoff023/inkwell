import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/form";
import { safeNextPath } from "@/lib/validation/auth";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined;
  return (
    <>
      <h1 className="font-serif text-3xl">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted">Your words are where you left them.</p>
      {error === "link" && (
        <div className="mb-5">
          <FormMessage error="That link is invalid or has expired. Please try again." />
        </div>
      )}
      <LoginForm next={nextPath} />
      <p className="mt-8 text-center text-sm text-muted">
        New to Inkwell?{" "}
        <Link href="/signup" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
