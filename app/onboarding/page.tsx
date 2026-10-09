import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { Wordmark } from "@/components/shell/wordmark";
import { requireViewer } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const viewer = await requireViewer("/onboarding");
  return (
    <div className="flex flex-1 flex-col px-4">
      <header className="mx-auto w-full max-w-5xl py-6">
        <Wordmark href="/home" />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 py-10 sm:py-16">
        <h1 className="font-serif text-3xl sm:text-4xl">Welcome, {viewer.display_name}.</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">This is a place for your words. Before you begin, one thing worth knowing:</p>
        <div className="mt-6 flex gap-4 rounded-xl border border-line bg-white/70 p-5">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-taupe" strokeWidth={1.6} />
          <p className="leading-relaxed">
            <strong className="font-medium">Every new entry starts private.</strong> Only you can see it. When something feels
            ready, you can publish it, and you can take it back at any time.
          </p>
        </div>
        <div className="mt-10">
          <OnboardingForm selected={viewer.interests} />
        </div>
      </main>
    </div>
  );
}
