import { BookLock, Compass, Library, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, OwnEntryItem } from "@/components/entries/own-entry-list";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { listOwnEntries } from "@/lib/entries/queries";
import { PROMPTS, promptIndexFor } from "@/lib/prompts";
import { PromptCard } from "./prompt-card";

export const metadata: Metadata = { title: "Home" };

const QUICK_ACTIONS = [
  { href: "/write", label: "Write something", icon: PenLine },
  { href: "/journal", label: "Open journal", icon: BookLock },
  { href: "/discover", label: "Browse Discover", icon: Compass },
  { href: "/library", label: "View library", icon: Library },
] as const;

function greeting(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const viewer = await requireViewer("/home");
  const recent = await listOwnEntries({ limit: 5 });
  const now = new Date();
  const promptIndex = promptIndexFor(now);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl sm:text-4xl">
        {/* ponytail: greeting uses server time (UTC on most hosts); pass the reader's zone if it feels off. */}
        {greeting(now.getUTCHours())}, {viewer.display_name}.
      </h1>

      <div className="mt-8">
        <PromptCard prompt={PROMPTS[promptIndex]} index={promptIndex} />
      </div>

      <nav aria-label="Quick actions" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col gap-3 rounded-xl border border-line bg-white/50 p-4 text-sm hover:bg-white">
            <Icon aria-hidden className="size-5 text-taupe" strokeWidth={1.6} />
            {label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="recent-heading" className="mt-14">
        <div className="flex items-baseline justify-between">
          <h2 id="recent-heading" className="font-serif text-2xl">
            Recent writing
          </h2>
          {recent.length > 0 && (
            <Link href="/library" className="text-sm text-muted hover:text-ink">
              See all
            </Link>
          )}
        </div>
        <div className="mt-4">
          {recent.length === 0 ? (
            <EmptyState title="Nothing here yet. Your first entry is one sentence away.">
              <Link href="/write" className={buttonClass("primary")}>
                Write your first entry
              </Link>
            </EmptyState>
          ) : (
            <div className="divide-y divide-line">
              {recent.map((e) => (
                <OwnEntryItem key={e.id} entry={e} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
