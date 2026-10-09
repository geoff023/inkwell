import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/lib/auth";
import { ResetPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const signedIn = Boolean(await getUserId());
  return (
    <>
      <h1 className="font-serif text-3xl">Choose a new password</h1>
      {signedIn ? (
        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      ) : (
        <p className="mt-4 text-muted">
          This reset link has expired.{" "}
          <Link href="/forgot-password" className="text-ink underline underline-offset-4">
            Request a new one
          </Link>
          .
        </p>
      )}
    </>
  );
}
