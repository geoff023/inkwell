import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/entries/own-entry-list";
import { PostList } from "@/components/feed/post-card";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { listSaved } from "@/lib/posts/queries";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  await requireViewer("/saved");
  const posts = await listSaved();
  return (
    <main className="mx-auto w-full max-w-reading px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl">Saved</h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
        <Lock aria-hidden className="size-3.5" /> Only you can see what you&apos;ve saved.
      </p>
      <div className="mt-6">
        {posts.length === 0 ? (
          <EmptyState title="Nothing saved yet. Pieces you bookmark will wait for you here.">
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
