import { ArrowLeft, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryBody } from "@/components/entries/entry-body";
import { Avatar } from "@/components/social/avatar";
import { BookmarkButton, LikeButton } from "@/components/social/buttons";
import { Comments } from "@/components/social/comments";
import { ReportDialog } from "@/components/social/report-dialog";
import { buttonClass } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { countWords, displayTitle, excerpt, readingMinutes } from "@/lib/content";
import { formatDay } from "@/lib/dates";
import { getPost, listComments } from "@/lib/posts/queries";
import { entryIdSchema } from "@/lib/validation/entry";

async function load(id: string) {
  return entryIdSchema.safeParse(id).success ? getPost(id) : null;
}

// Metadata only ever comes from public posts, so private text can't leak
// into titles or link previews.
export async function generateMetadata({ params }: PageProps<"/post/[id]">): Promise<Metadata> {
  const post = await load((await params).id);
  if (!post) return { title: "Not found" };
  return {
    title: `${displayTitle(post, 60)} · ${post.author.display_name}`,
    description: excerpt(post.content_text, 160),
  };
}

export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const post = await load(id);
  if (!post) notFound();
  const [comments, viewerId] = await Promise.all([listComments(post.id), getUserId()]);
  const isAuthor = viewerId === post.author.id;
  const minutes = readingMinutes(countWords(post.content_text));

  return (
    <main className="mx-auto w-full max-w-reading px-4 py-10 sm:py-16">
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> Discover
      </Link>

      <article className="mt-10">
        <header>
          <div className="flex items-center gap-3">
            <Avatar name={post.author.display_name} />
            <div className="text-sm">
              <Link href={`/u/${post.author.username}`} className="font-medium hover:underline">
                {post.author.display_name}
              </Link>
              <p className="text-muted">
                <time dateTime={post.published_at}>{formatDay(post.published_at)}</time> · {minutes} min read
              </p>
            </div>
          </div>
          {post.title ? (
            <h1 className="mt-8 font-serif text-4xl leading-tight font-semibold text-balance">{post.title}</h1>
          ) : (
            <h1 className="sr-only">{displayTitle(post)}</h1>
          )}
        </header>

        <EntryBody doc={post.content_json} className={post.title ? "mt-8" : "mt-8 text-[1.3rem]"} />

        {post.tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Topics">
            {post.tags.map((t) => (
              <li key={t.slug}>
                <Link href={`/discover?tag=${t.slug}`} className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink">
                  #{t.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-y border-line py-3">
          <div className="-ml-2.5 flex items-center gap-1">
            <LikeButton entryId={post.id} liked={post.liked} count={post.likeCount} />
            <BookmarkButton entryId={post.id} bookmarked={post.bookmarked} />
          </div>
          {isAuthor ? (
            <Link href={`/write/${post.id}`} className={buttonClass("ghost", "py-1.5 text-xs")}>
              <PenLine aria-hidden className="size-3.5" /> Edit
            </Link>
          ) : (
            <ReportDialog target="entry" targetId={post.id} label="post" signedIn={Boolean(viewerId)} />
          )}
        </div>
      </article>

      <Comments
        entryId={post.id}
        postAuthorId={post.author.id}
        comments={comments}
        viewerId={viewerId}
        loginHref={`/login?next=${encodeURIComponent(`/post/${post.id}`)}`}
      />
    </main>
  );
}
