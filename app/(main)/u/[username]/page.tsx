import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/entries/own-entry-list";
import { PostList } from "@/components/feed/post-card";
import { Avatar } from "@/components/social/avatar";
import { BlockButton, FollowButton } from "@/components/social/buttons";
import { ReportDialog } from "@/components/social/report-dialog";
import { buttonClass } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { decodeCursor } from "@/lib/posts/cursor";
import { getProfile, listAuthorPosts } from "@/lib/posts/queries";
import { usernameSchema } from "@/lib/validation/auth";

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

async function load(username: string) {
  const parsed = usernameSchema.safeParse(decodeURIComponent(username));
  return parsed.success ? getProfile(parsed.data) : null;
}

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const profile = await load((await params).username);
  return profile ? { title: `${profile.display_name} (@${profile.username})`, description: profile.bio ?? undefined } : { title: "Not found" };
}

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  const profile = await load((await params).username);
  if (!profile) notFound();
  const cursor = decodeCursor((await searchParams).cursor);
  const [posts, viewerId] = await Promise.all([listAuthorPosts(profile.id, cursor), getUserId()]);
  const loginHref = `/login?next=${encodeURIComponent(`/u/${profile.username}`)}`;

  return (
    <main className="mx-auto w-full max-w-reading px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={profile.display_name} size="lg" />
          <div>
            <h1 className="font-serif text-3xl">{profile.display_name}</h1>
            <p className="text-muted">@{profile.username}</p>
            {profile.bio && <p className="mt-3 max-w-prose leading-relaxed whitespace-pre-line">{profile.bio}</p>}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                <strong className="font-medium text-ink">{profile.followerCount}</strong> {profile.followerCount === 1 ? "follower" : "followers"}
              </span>
              <span>
                <strong className="font-medium text-ink">{profile.followingCount}</strong> following
              </span>
              <span>Writing since {monthYear.format(new Date(profile.created_at))}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {profile.isViewer ? (
            <Link href="/settings" className={buttonClass("secondary", "px-4 py-2")}>
              Edit profile
            </Link>
          ) : viewerId ? (
            <>
              {!profile.viewerBlocks && <FollowButton profileId={profile.id} following={profile.viewerFollows} />}
              <BlockButton profileId={profile.id} blocked={profile.viewerBlocks} name={profile.display_name} />
              <ReportDialog target="profile" targetId={profile.id} label="profile" signedIn />
            </>
          ) : (
            <Link href={loginHref} className={buttonClass("primary", "px-5 py-2")}>
              Follow
            </Link>
          )}
        </div>
      </header>

      <section aria-labelledby="posts-heading" className="mt-12">
        <h2 id="posts-heading" className="border-b border-line pb-3 text-xs font-medium tracking-[0.15em] text-taupe uppercase">
          Published writing
        </h2>
        {profile.viewerBlocks ? (
          <p className="py-10 text-muted">You&apos;ve blocked this writer. Unblock to see their writing.</p>
        ) : posts.items.length === 0 ? (
          <div className="mt-6">
            <EmptyState title={profile.isViewer ? "You haven't published anything yet." : "Nothing published yet."}>
              {profile.isViewer && (
                <Link href="/write" className={buttonClass("primary")}>
                  Write something
                </Link>
              )}
            </EmptyState>
          </div>
        ) : (
          <PostList posts={posts.items} showAuthor={false} />
        )}
        {(posts.nextCursor || cursor) && !profile.viewerBlocks && (
          <nav aria-label="Pagination" className="mt-8 flex justify-between border-t border-line pt-6 text-sm">
            {cursor ? (
              <Link href={`/u/${profile.username}`} className="text-muted hover:text-ink">
                ← Newest
              </Link>
            ) : (
              <span />
            )}
            {posts.nextCursor && (
              <Link href={`/u/${profile.username}?cursor=${posts.nextCursor}`} className={buttonClass("secondary")}>
                Older writing
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
