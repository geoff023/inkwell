import { Lock, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterChips, OwnEntryItem, SearchForm } from "@/components/entries/own-entry-list";
import { railAside, railGrid, railMain } from "@/components/shell/page-grid";
import { PageHeader } from "@/components/shell/page-header";
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
    <main className={railGrid}>
      <PageHeader
        title="Journal"
        description={
          <>
            <Lock aria-hidden className="size-4 shrink-0" /> Private entries and drafts. Only you can see these.
          </>
        }
        action={
          <Link href="/write" className={buttonClass("primary")}>
            <PenLine aria-hidden className="size-4" /> New entry
          </Link>
        }
      />

      <div className={`space-y-4 xl:mt-2 xl:space-y-6 ${railAside}`}>
        <SearchForm action="/journal" q={q} placeholder="Search your journal" />
        {tagOptions.length > 0 && (
          <FilterChips
            label="Filter by tag"
            current={tag}
            hrefFor={hrefFor}
            rail
            options={[{ value: "", label: "All" }, ...tagOptions.map(([value, label]) => ({ value, label: `#${label}` }))]}
          />
        )}
      </div>

      <div className={railMain}>
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
              <h2 id={`day-${g.day}`} className="sticky top-14 z-10 bg-paper/95 py-2 font-serif text-sm text-taupe italic backdrop-blur-sm lg:top-0">
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
