import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, FilterChips } from "@/components/entries/own-entry-list";
import { PostList } from "@/components/feed/post-card";
import { buttonClass } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { decodeCursor } from "@/lib/posts/cursor";
import { listFeed } from "@/lib/posts/queries";
import { slugify } from "@/lib/validation/entry";
import { INTERESTS } from "@/lib/validation/profile";

export const metadata: Metadata = { title: "Discover", description: "Short thoughts and longer reflections, shared on Inkwell." };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const signedIn = Boolean(await getUserId());
  const mode = sp.mode === "following" ? "following" : "latest";
  const tag = typeof sp.tag === "string" ? slugify(sp.tag) : "";
  const cursor = decodeCursor(sp.cursor);

  const feed = await listFeed({ mode, cursor, tag: tag || undefined });

  const href = (next: { mode?: string; tag?: string; cursor?: string }) => {
    const params = new URLSearchParams();
    const merged = { mode: mode === "latest" ? "" : mode, tag, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/discover?${s}` : "/discover";
  };

  const tabs = [
    { value: "latest", label: "Latest" },
    { value: "following", label: "Following" },
  ];

  return (
    <main className="mx-auto w-full max-w-reading px-4 py-10 sm:py-14">
      <header>
        <h1 className="font-serif text-3xl">Discover</h1>
        <p className="mt-1.5 text-muted">Words people chose to share.</p>
      </header>

      <div className="mt-8 space-y-4">
        <nav aria-label="Feed" className="flex gap-6 border-b border-line">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={t.value === "following" && !signedIn ? "/login?next=%2Fdiscover%3Fmode%3Dfollowing" : href({ mode: t.value === "latest" ? "" : t.value, cursor: "" })}
              aria-current={mode === t.value ? "page" : undefined}
              className="-mb-px border-b-2 border-transparent pb-3 text-sm text-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:text-ink"
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <FilterChips
          label="Topics"
          current={tag}
          hrefFor={(v) => href({ tag: v, cursor: "" })}
          options={[
            { value: "", label: "All topics" },
            ...INTERESTS.map((i) => ({ value: i.slug, label: i.label })),
            ...(tag && !INTERESTS.some((i) => i.slug === tag) ? [{ value: tag, label: `#${tag}` }] : []),
          ]}
        />
      </div>

      <div className="mt-4">
        {feed.items.length > 0 ? (
          <PostList posts={feed.items} />
        ) : feed.followsNobody ? (
          <div className="mt-6">
            <EmptyState title="You're not following anyone yet.">
              <Link href={href({ mode: "", cursor: "" })} className={buttonClass("primary")}>
                Discover writers
              </Link>
            </EmptyState>
          </div>
        ) : cursor ? (
          <p className="py-10 text-center text-muted">You&apos;ve reached the beginning.</p>
        ) : (
          <div className="mt-6">
            <EmptyState title={tag || mode === "following" ? "Nothing here yet." : "A quiet page for now. Be the first to share something."}>
              <Link href={signedIn ? "/write" : "/signup"} className={buttonClass("primary")}>
                Share a thought
              </Link>
            </EmptyState>
          </div>
        )}
      </div>

      {(feed.nextCursor || cursor) && (
        <nav aria-label="Pagination" className="mt-8 flex justify-between border-t border-line pt-6 text-sm">
          {cursor ? (
            <Link href={href({ cursor: "" })} className="text-muted hover:text-ink">
              ← Back to newest
            </Link>
          ) : (
            <span />
          )}
          {feed.nextCursor && (
            <Link href={href({ cursor: feed.nextCursor })} className={buttonClass("secondary")}>
              Older writing
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
