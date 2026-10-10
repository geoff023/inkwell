import { BookLock, Compass, Library, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, OwnEntryItem } from "@/components/entries/own-entry-list";
import { railAside, railGrid, railHeading, railMain, sectionHeading } from "@/components/shell/page-grid";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { countWords } from "@/lib/content";
import { listOwnEntries } from "@/lib/entries/queries";
import { isPublic } from "@/lib/entries/state";
import { promptIndexFor } from "@/lib/prompts";
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
  const entries = await listOwnEntries();
  const recent = entries.slice(0, 5);
  const published = entries.filter(isPublic).length;
  const words = entries.reduce((sum, e) => sum + countWords(e.content_text), 0);
  const now = new Date();
  const promptIndex = promptIndexFor(now);

  return (
    // One DOM order for all sizes; on wide screens the aside moves into a right column.
    <main className={railGrid}>
      {/* ponytail: greeting uses server time (UTC on most hosts); pass the reader's zone if it feels off. */}
      <PageHeader title={`${greeting(now.getUTCHours())}, ${viewer.display_name}.`} />

      <div className={railMain}>
        <PromptCard initialIndex={promptIndex} today={now.toISOString().slice(0, 10)} />
      </div>

      <aside aria-label="Shortcuts and totals" className={`space-y-8 ${railAside}`}>
        <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-1 xl:gap-1">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-sm hover:bg-white xl:flex-row xl:items-center xl:border-0 xl:bg-transparent xl:px-3 xl:py-2.5 xl:hover:bg-paper-soft"
            >
              <Icon aria-hidden className="size-5 text-taupe xl:size-4" strokeWidth={1.6} />
              {label}
            </Link>
          ))}
        </nav>
        {entries.length > 0 && (
          <section aria-labelledby="totals-heading" className="hidden rounded-xl border border-line bg-surface p-5 xl:block">
            <h2 id="totals-heading" className={railHeading}>
              Your writing so far
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Entries", entries.length],
                ["Published", published],
                ["Kept private", entries.length - published],
                ["Words written", words],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className="tabular-nums">{value.toLocaleString("en")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </aside>

      <section aria-labelledby="recent-heading" className={`mt-4 ${railMain}`}>
        <div className="flex items-baseline justify-between">
          <h2 id="recent-heading" className={sectionHeading}>
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
