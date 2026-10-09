import { Lock, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterChips, OwnEntryItem, SearchForm } from "@/components/entries/own-entry-list";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { groupByDay } from "@/lib/dates";
import { listOwnEntries } from "@/lib/entries/queries";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  await requireViewer("/journal");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const tag = typeof sp.tag === "string" ? sp.tag : "";

  const all = (await listOwnEntries({ q, visibility: "private" })).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const tagOptions = [...new Map(all.flatMap((e) => e.tags).map((t) => [t.slug, t.name]))].sort((a, b) => a[1].localeCompare(b[1]));
  const entries = tag ? all.filter((e) => e.tags.some((t) => t.slug === tag)) : all;
  const groups = groupByDay(entries, (e) => e.created_at);

  const hrefFor = (value: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("tag", value);
    const s = params.toString();
    return s ? `/journal?${s}` : "/journal";
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Journal</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Lock aria-hidden className="size-3.5" /> Private entries and drafts. Only you can see these.
          </p>
        </div>
        <Link href="/write" className={buttonClass("primary")}>
          <PenLine aria-hidden className="size-4" /> New entry
        </Link>
      </header>

      <div className="mt-8 space-y-4">
        <SearchForm action="/journal" q={q} placeholder="Search your journal" />
        {tagOptions.length > 0 && (
          <FilterChips
            label="Filter by tag"
            current={tag}
            hrefFor={hrefFor}
            options={[{ value: "", label: "All" }, ...tagOptions.map(([value, label]) => ({ value, label: `#${label}` }))]}
          />
        )}
      </div>

      <div className="mt-8">
        {entries.length === 0 ? (
          q || tag ? (
            <EmptyState title="Nothing matches that search.">
              <Link href="/journal" className={buttonClass("secondary")}>
                Clear search
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title="Your words will find their place here.">
              <Link href="/write" className={buttonClass("primary")}>
                Write your first entry
              </Link>
            </EmptyState>
          )
        ) : (
          groups.map((g) => (
            <section key={g.day} aria-labelledby={`day-${g.day}`} className="mb-6">
              <h2 id={`day-${g.day}`} className="sticky top-16 z-10 bg-paper/95 py-2 text-xs font-medium tracking-[0.15em] text-taupe uppercase backdrop-blur-sm">
                {g.day}
              </h2>
              <div className="divide-y divide-line">
                {g.items.map((e) => (
                  <OwnEntryItem key={e.id} entry={e} redirectTo="/journal" />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
