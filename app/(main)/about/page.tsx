import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "About" };

const PRINCIPLES = [
  ["Words matter more than numbers.", "There are no trending charts or follower leaderboards here. Likes exist, quietly."],
  ["Private writing deserves the same care.", "Your journal gets the same editor and the same typography as anything you publish."],
  ["Short, imperfect thoughts are welcome.", "A sentence is enough. Titles are optional."],
  ["Sharing is always your choice.", "Everything starts private. You can publish, unpublish or delete at any time."],
  ["Reading should feel calm.", "No infinite autoplay, no pop-ups asking for your attention. Just text, given room to breathe."],
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-reading px-4 py-16 sm:py-24">
      <h1 className="font-serif text-4xl leading-tight">A home for your words</h1>
      <div className="prose-ink mt-8">
        <p>
          Inkwell is a diary and a small literary journal in the same place. Keep a private record of your days, and when
          something feels ready, share it with people who read slowly.
        </p>
      </div>

      <h2 className="mt-14 font-serif text-2xl">What we believe</h2>
      <ol className="mt-6 space-y-6">
        {PRINCIPLES.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="font-serif text-taupe">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-14 font-serif text-2xl">About privacy</h2>
      <p className="mt-4 leading-relaxed text-muted">
        Private entries are stored as private application data. Access rules in the database make sure only you can read
        them, and they never appear in feeds, search, or your public profile. They are not end-to-end encrypted, so please
        don&apos;t keep passwords or other secrets in your journal.
      </p>

      <Link href="/signup" className={buttonClass("primary", "mt-12")}>
        Start writing
      </Link>
    </main>
  );
}
