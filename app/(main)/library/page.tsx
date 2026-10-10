import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterChips, OwnEntryItem, SearchForm } from "@/components/entries/own-entry-list";
import { railAside, railGrid, railMain } from "@/components/shell/page-grid";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { listOwnEntries } from "@/lib/entries/queries";
import type { EntryStatus } from "@/types/database";

export const metadata: Metadata = { title: "Library" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];
const VISIBILITY_OPTIONS = [
  { value: "", label: "Any visibility" },
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  await requireViewer("/library");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const status = STATUS_OPTIONS.some((o) => o.value && o.value === sp.status) ? (sp.status as EntryStatus) : "";
  const visibility = sp.visibility === "private" || sp.visibility === "public" ? sp.visibility : "";

  const entries = await listOwnEntries({ q: q || undefined, status: status || undefined, visibility: visibility || undefined });

  const hrefWith = (key: "status" | "visibility", value: string) => {
    const params = new URLSearchParams();
    const next = { q, status, visibility, [key]: value };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/library?${s}` : "/library";
  };
  const filtered = Boolean(q || status || visibility);

  return (
    <main className={railGrid}>
      <PageHeader
        title="Library"
        description="Everything you've written, private and public."
        action={
          <Link href="/write" className={buttonClass("primary")}>
            <PenLine aria-hidden className="size-4" /> New entry
          </Link>
        }
      />

      <div className={`space-y-4 xl:mt-2 xl:space-y-6 ${railAside}`}>
        <SearchForm action="/library" q={q} placeholder="Search titles, text and tags" hidden={{ ...(status && { status }), ...(visibility && { visibility }) }} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch xl:gap-6">
          <FilterChips rail label="Filter by status" options={STATUS_OPTIONS} current={status} hrefFor={(v) => hrefWith("status", v)} />
          <FilterChips rail label="Filter by visibility" options={VISIBILITY_OPTIONS} current={visibility} hrefFor={(v) => hrefWith("visibility", v)} />
        </div>
      </div>

      <div className={railMain}>
        {entries.length === 0 ? (
          filtered ? (
            <EmptyState title="Nothing matches these filters.">
              <Link href="/library" className={buttonClass("secondary")}>
                Show everything
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
          <>
            <p className="text-xs text-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
            <div className="divide-y divide-line">
              {entries.map((e) => (
                <OwnEntryItem key={e.id} entry={e} redirectTo="/library" />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
