import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/entries/own-entry-list";
import { PostList } from "@/components/feed/post-card";
import { railAside, railGrid, railHeading, railMain } from "@/components/shell/page-grid";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { listSaved } from "@/lib/posts/queries";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  await requireViewer("/saved");
  const posts = await listSaved();
  return (
    <main className={railGrid}>
      <PageHeader title="Saved" description="Pieces you bookmarked to read again." />

      <aside aria-label="About saved posts" className={`hidden xl:block xl:mt-2 ${railAside}`}>
        <div className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-muted">
          <h2 className={`flex items-center gap-2 text-ink ${railHeading}`}>
            <Lock aria-hidden className="size-4 text-taupe" /> Only you can see this
          </h2>
          <p className="mt-2">
            Writers aren&apos;t told when you save their work. If an author makes a piece private, it leaves this list.
          </p>
          <p className="mt-3 text-ink tabular-nums">{posts.length === 1 ? "1 saved piece" : `${posts.length} saved pieces`}</p>
        </div>
      </aside>

      <div className={railMain}>
        {posts.length === 0 ? (
          <EmptyState title="Nothing saved yet. Bookmark a piece in Discover and it will wait for you here.">
            <Link href="/discover" className={buttonClass("primary")}>
              Browse Discover
            </Link>
          </EmptyState>
        ) : (
          <PostList posts={posts} />
        )}
      </div>
    </main>
  );
}
