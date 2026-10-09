import "server-only";

import { getUserId } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { encodeCursor, olderThan, type Cursor } from "./cursor";

// Reads of public writing. Every query filters on published + public itself,
// in addition to RLS, so an author viewing their own feed never sees their
// private drafts mixed in.

const POST_FIELDS =
  "id, title, content_text, published_at, author_id, author:profiles!entries_author_id_fkey(id, username, display_name), entry_tags(tags(name, slug)), likes(count), comments(count)" as const;

export type PostAuthor = { id: string; username: string; display_name: string };

export type PostSummary = {
  id: string;
  title: string | null;
  content_text: string;
  published_at: string;
  author: PostAuthor;
  tags: { name: string; slug: string }[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  bookmarked: boolean;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;

type PostRow = {
  id: string;
  title: string | null;
  content_text: string;
  published_at: string | null;
  author: PostAuthor | null;
  entry_tags: { tags: { name: string; slug: string } | null }[];
  likes: { count: number }[];
  comments: { count: number }[];
};

const PAGE_SIZE = 20;

function publicPosts(supabase: Supabase, extraFields = "") {
  return supabase
    .from("entries")
    .select(`${POST_FIELDS}${extraFields}`)
    .eq("status", "published")
    .eq("visibility", "public");
}

/** Adds the viewer's like/bookmark state with two small lookups. */
async function decorate(supabase: Supabase, rows: PostRow[]): Promise<PostSummary[]> {
  const viewerId = await getUserId();
  const ids = rows.map((r) => r.id);
  let liked = new Set<string>();
  let bookmarked = new Set<string>();
  if (viewerId && ids.length) {
    const [l, b] = await Promise.all([
      supabase.from("likes").select("entry_id").eq("user_id", viewerId).in("entry_id", ids),
      supabase.from("bookmarks").select("entry_id").eq("user_id", viewerId).in("entry_id", ids),
    ]);
    liked = new Set(l.data?.map((r) => r.entry_id));
    bookmarked = new Set(b.data?.map((r) => r.entry_id));
  }
  return rows.flatMap((r) =>
    r.author && r.published_at
      ? [
          {
            id: r.id,
            title: r.title,
            content_text: r.content_text,
            published_at: r.published_at,
            author: r.author,
            tags: r.entry_tags.flatMap((et) => (et.tags ? [et.tags] : [])),
            likeCount: r.likes[0]?.count ?? 0,
            commentCount: r.comments[0]?.count ?? 0,
            liked: liked.has(r.id),
            bookmarked: bookmarked.has(r.id),
          },
        ]
      : [],
  );
}

function toPage(rows: PostRow[], items: PostSummary[]): Page<PostSummary> {
  const last = rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1] : null;
  return {
    items: items.slice(0, PAGE_SIZE),
    nextCursor: last?.published_at ? encodeCursor({ at: last.published_at, id: last.id }) : null,
  };
}

export type FeedOptions = { mode: "latest" | "following"; cursor: Cursor | null; tag?: string };

export async function listFeed({ mode, cursor, tag }: FeedOptions): Promise<Page<PostSummary> & { followsNobody?: boolean }> {
  const supabase = await supabaseServer();
  const viewerId = await getUserId();

  let tagId: string | null = null;
  if (tag) {
    const { data } = await supabase.from("tags").select("id").eq("slug", tag).maybeSingle();
    if (!data) return { items: [], nextCursor: null };
    tagId = data.id;
  }

  let query = publicPosts(supabase, tagId ? ", tag_filter:entry_tags!inner(tag_id)" : "");
  if (tagId) query = query.eq("tag_filter.tag_id", tagId);

  if (viewerId) {
    // ponytail: follow and block lists go into IN filters; fine for hundreds
    // of rows, move to a SQL view or RPC if people follow thousands.
    const [{ data: follows }, { data: blocks }] = await Promise.all([
      mode === "following" ? supabase.from("follows").select("following_id").eq("follower_id", viewerId) : Promise.resolve({ data: null }),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId),
    ]);
    if (mode === "following") {
      const ids = follows?.map((f) => f.following_id) ?? [];
      if (ids.length === 0) return { items: [], nextCursor: null, followsNobody: true };
      query = query.in("author_id", ids);
    }
    const blocked = blocks?.map((b) => b.blocked_id) ?? [];
    if (blocked.length) query = query.not("author_id", "in", `(${blocked.join(",")})`);
  } else if (mode === "following") {
    return { items: [], nextCursor: null, followsNobody: true };
  }

  if (cursor) query = query.or(olderThan(cursor));
  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (error) throw new Error(`Could not load the feed: ${error.message}`);
  const rows = data as unknown as PostRow[];
  return toPage(rows, await decorate(supabase, rows));
}

export async function listAuthorPosts(authorId: string, cursor: Cursor | null): Promise<Page<PostSummary>> {
  const supabase = await supabaseServer();
  let query = publicPosts(supabase).eq("author_id", authorId);
  if (cursor) query = query.or(olderThan(cursor));
  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  const rows = data as unknown as PostRow[];
  return toPage(rows, await decorate(supabase, rows));
}

/** A single public post, or null if it doesn't exist or isn't public. */
export async function getPost(id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await publicPosts(supabase, ", content_json").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load this post: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as PostRow & { content_json: unknown };
  const [post] = await decorate(supabase, [row]);
  return post ? { ...post, content_json: row.content_json } : null;
}

export type CommentView = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: PostAuthor;
};

export async function listComments(entryId: string): Promise<CommentView[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, updated_at, author:profiles!comments_author_id_fkey(id, username, display_name)")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true })
    // ponytail: first 500 comments only; paginate if discussions get long.
    .limit(500);
  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return (data as unknown as (CommentView & { author: PostAuthor | null })[]).flatMap((c) => (c.author ? [{ ...c, author: c.author }] : []));
}

/** The viewer's bookmarks that are still public, newest bookmark first. */
export async function listSaved(): Promise<PostSummary[]> {
  const viewerId = await getUserId();
  if (!viewerId) return [];
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("bookmarks")
    .select(`created_at, entry:entries!inner(${POST_FIELDS}, status, visibility)`)
    .eq("user_id", viewerId)
    .eq("entry.status", "published")
    .eq("entry.visibility", "public")
    .order("created_at", { ascending: false })
    // ponytail: newest 200 bookmarks; paginate when someone saves more.
    .limit(200);
  if (error) throw new Error(`Could not load saved posts: ${error.message}`);
  const rows = (data as unknown as { entry: PostRow | null }[]).flatMap((b) => (b.entry ? [b.entry] : []));
  return decorate(supabase, rows);
}

export async function getProfile(username: string) {
  const supabase = await supabaseServer();
  const viewerId = await getUserId();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return null;

  const [followers, following, viewerFollows, viewerBlocks] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    viewerId
      ? supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewerId
      ? supabase.from("blocks").select("blocker_id").eq("blocker_id", viewerId).eq("blocked_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...profile,
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    viewerFollows: Boolean(viewerFollows.data),
    viewerBlocks: Boolean(viewerBlocks.data),
    isViewer: viewerId === profile.id,
  };
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
