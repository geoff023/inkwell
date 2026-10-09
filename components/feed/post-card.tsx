import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { BookmarkButton, LikeButton } from "@/components/social/buttons";
import { Avatar } from "@/components/social/avatar";
import { excerpt } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import type { PostSummary } from "@/lib/posts/queries";

export function PostCard({ post, showAuthor = true }: { post: PostSummary; showAuthor?: boolean }) {
  // Title-less short thoughts are shown whole-ish, in a larger serif.
  const short = !post.title && post.content_text.length <= 320;
  return (
    <article className="relative py-7">
      {showAuthor && (
        <div className="flex items-center gap-2.5 text-sm">
          <Avatar name={post.author.display_name} size="sm" />
          <Link href={`/u/${post.author.username}`} className="relative z-10 font-medium hover:underline">
            {post.author.display_name}
          </Link>
          <span className="truncate text-muted">@{post.author.username}</span>
        </div>
      )}
      <Link href={`/post/${post.id}`} className="mt-3 block rounded-sm after:absolute after:inset-0">
        {post.title && <h2 className="font-serif text-2xl leading-snug text-balance">{post.title}</h2>}
        <p className={`font-serif leading-relaxed text-ink/90 ${short ? "text-xl whitespace-pre-line" : "mt-2 line-clamp-4 text-lg"}`}>
          {short ? post.content_text : excerpt(post.content_text, 300)}
        </p>
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        {post.tags.map((t) => (
          <Link key={t.slug} href={`/discover?tag=${t.slug}`} className="relative z-10 hover:text-ink">
            #{t.name}
          </Link>
        ))}
      </div>
      <div className="relative z-10 mt-2 -ml-2.5 flex items-center gap-1">
        <LikeButton entryId={post.id} liked={post.liked} count={post.likeCount} />
        <Link href={`/post/${post.id}#comments-heading`} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted hover:bg-paper-soft hover:text-ink">
          <MessageCircle aria-hidden className="size-4" strokeWidth={1.8} />
          <span aria-hidden>{post.commentCount}</span>
          <span className="sr-only">{post.commentCount === 1 ? "1 response" : `${post.commentCount} responses`}</span>
        </Link>
        <BookmarkButton entryId={post.id} bookmarked={post.bookmarked} />
      </div>
    </article>
  );
}

export function PostList({ posts, showAuthor }: { posts: PostSummary[]; showAuthor?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} showAuthor={showAuthor} />
      ))}
    </div>
  );
}
