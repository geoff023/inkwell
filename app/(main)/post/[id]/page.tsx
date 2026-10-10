import { ArrowLeft, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryBody } from "@/components/entries/entry-body";
import { Avatar } from "@/components/social/avatar";
import { BookmarkButton, LikeButton } from "@/components/social/buttons";
import { Comments } from "@/components/social/comments";
import { ReportDialog } from "@/components/social/report-dialog";
import { railAside, railGrid, railMain } from "@/components/shell/page-grid";
import { buttonClass } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { displayTitle, excerpt, readingMinutes } from "@/lib/content";
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
  const minutes = readingMinutes(post.content_text);

  return (
    <main className={railGrid}>
      <Link href="/discover" className={`inline-flex items-center gap-1.5 justify-self-start text-sm text-muted hover:text-ink ${railMain}`}>
        <ArrowLeft aria-hidden className="size-4" /> Discover
      </Link>

      <article className={railMain}>
        <header>
          <div className="flex items-center gap-3 xl:hidden">
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
            <h1 className="mt-8 font-serif text-4xl leading-tight font-semibold text-balance xl:mt-0 xl:text-5xl">{post.title}</h1>
          ) : (
            <h1 className="sr-only">{displayTitle(post)}</h1>
          )}
        </header>

        <EntryBody doc={post.content_json} className={`mt-8 ${post.title ? "" : "text-[1.3rem] xl:mt-0"}`} />

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
      </article>

      {/* One set of actions: under the piece on small screens, beside it (and in view) on wide ones. */}
      <aside aria-label="About this piece" className={`xl:mt-11 ${railAside}`}>
        <div className="hidden items-center gap-3 border-b border-line pb-5 xl:flex">
          <Avatar name={post.author.display_name} />
          <div className="min-w-0 text-sm">
            <Link href={`/u/${post.author.username}`} className="block truncate font-medium hover:underline">
              {post.author.display_name}
            </Link>
            <p className="text-muted">
              <time dateTime={post.published_at}>{formatDay(post.published_at)}</time>
              <br />
              {minutes} min read
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-line py-3 xl:flex-col xl:items-start xl:border-0 xl:pt-4">
          <div className="-ml-2.5 flex items-center gap-1">
            <LikeButton entryId={post.id} liked={post.liked} count={post.likeCount} />
            <BookmarkButton entryId={post.id} bookmarked={post.bookmarked} />
          </div>
          {isAuthor ? (
            <Link href={`/write/${post.id}`} className={buttonClass("ghost", "py-1.5 text-xs xl:-ml-2.5")}>
              <PenLine aria-hidden className="size-3.5" /> Edit
            </Link>
          ) : (
            <span className="xl:-ml-2.5">
              <ReportDialog target="entry" targetId={post.id} label="post" signedIn={Boolean(viewerId)} />
            </span>
          )}
        </div>
      </aside>

      <div className={railMain}>
      <Comments
        entryId={post.id}
        postAuthorId={post.author.id}
        comments={comments}
        viewerId={viewerId}
        loginHref={`/login?next=${encodeURIComponent(`/post/${post.id}`)}`}
      />
      </div>
    </main>
  );
}
