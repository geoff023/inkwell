import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;

const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

async function newEntry(author: string, text: string) {
  const [row] = await db.as<{ id: string }>(
    author,
    "insert into public.entries (title, content_json, content_text) values ($1, $2, $3) returning id",
    [null, doc(text), text],
  );
  return row.id;
}

async function publish(author: string, id: string) {
  await db.as(author, "update public.entries set status = 'published', visibility = 'public' where id = $1", [id]);
}

async function unpublish(author: string, id: string) {
  await db.as(author, "update public.entries set status = 'unpublished', visibility = 'private' where id = $1", [id]);
}

const visibleIds = async (viewer: string | null) =>
  (await db.as<{ id: string }>(viewer, "select id from public.entries")).map((r) => r.id);

beforeAll(async () => {
  db = await createDb();
  alice = await db.createUser("alice");
  bob = await db.createUser("bob");
});

afterAll(async () => {
  await db.close();
});

describe("profiles", () => {
  it("are created from sign-up metadata", async () => {
    const rows = await db.as<{ username: string }>(null, "select username from public.profiles order by username");
    expect(rows.map((r) => r.username)).toEqual(["alice", "bob"]);
  });

  it("do not expose email or auth data to visitors", async () => {
    const [row] = await db.as<Record<string, unknown>>(null, "select * from public.profiles where id = $1", [alice]);
    expect(Object.keys(row)).not.toContain("email");
    await expect(db.as(null, "select email from auth.users")).rejects.toThrow(/permission denied/);
  });

  it("can only be updated by their owner", async () => {
    await db.as(bob, "update public.profiles set bio = 'hijacked' where id = $1", [alice]);
    const [row] = await db.as<{ bio: string | null }>(null, "select bio from public.profiles where id = $1", [alice]);
    expect(row.bio).toBeNull();
  });

  it("reject invalid usernames", async () => {
    await expect(db.as(alice, "update public.profiles set username = 'Bad Name!' where id = $1", [alice])).rejects.toThrow(
      /profiles_username_format/,
    );
  });
});

describe("entries", () => {
  it("are private drafts by default and hidden from others", async () => {
    const id = await newEntry(alice, "only for me");
    const [row] = await db.as<{ status: string; visibility: string }>(alice, "select status, visibility from public.entries where id = $1", [id]);
    expect(row).toEqual({ status: "draft", visibility: "private" });
    expect(await visibleIds(alice)).toContain(id);
    expect(await visibleIds(bob)).not.toContain(id);
    expect(await visibleIds(null)).not.toContain(id);
  });

  it("cannot be inserted already public", async () => {
    await expect(
      db.as(alice, "insert into public.entries (content_text, status, visibility) values ('x', 'published', 'public')"),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot be created on behalf of another user", async () => {
    await expect(db.as(bob, "insert into public.entries (author_id, content_text) values ($1, 'forged')", [alice])).rejects.toThrow(
      /row-level security/,
    );
  });

  it("reject invalid visibility/status combinations", async () => {
    const id = await newEntry(alice, "combo");
    await expect(db.as(alice, "update public.entries set visibility = 'public' where id = $1", [id])).rejects.toThrow(
      /entries_state_valid/,
    );
  });

  it("cannot be modified or deleted by another user", async () => {
    const id = await newEntry(alice, "mine");
    await publish(alice, id);
    const updated = await db.as(bob, "update public.entries set content_text = 'defaced' where id = $1 returning id", [id]);
    const deleted = await db.as(bob, "delete from public.entries where id = $1 returning id", [id]);
    expect(updated).toHaveLength(0);
    expect(deleted).toHaveLength(0);
    const [row] = await db.as<{ content_text: string }>(null, "select content_text from public.entries where id = $1", [id]);
    expect(row.content_text).toBe("mine");
  });

  it("become public on publish and private again on unpublish", async () => {
    const id = await newEntry(alice, "a public thought");
    await publish(alice, id);
    expect(await visibleIds(null)).toContain(id);
    expect(await visibleIds(bob)).toContain(id);

    const [before] = await db.as<{ published_at: string }>(alice, "select published_at from public.entries where id = $1", [id]);
    expect(before.published_at).not.toBeNull();

    await unpublish(alice, id);
    expect(await visibleIds(null)).not.toContain(id);
    expect(await visibleIds(bob)).not.toContain(id);
    expect(await visibleIds(alice)).toContain(id);

    await publish(alice, id);
    const [after] = await db.as<{ published_at: string }>(alice, "select published_at from public.entries where id = $1", [id]);
    expect(after.published_at).toEqual(before.published_at);
  });

  it("bump revision on every update and keep server-owned fields", async () => {
    const id = await newEntry(alice, "rev");
    await db.as(alice, "update public.entries set content_text = 'rev 2', revision = 99, published_at = now() where id = $1", [id]);
    const [row] = await db.as<{ revision: number; published_at: string | null }>(
      alice,
      "select revision, published_at from public.entries where id = $1",
      [id],
    );
    expect(row.revision).toBe(2);
    expect(row.published_at).toBeNull();
  });

  it("search only returns the caller's own entries and escapes wildcards", async () => {
    await newEntry(alice, "a lighthouse at dusk");
    const bobsPublic = await newEntry(bob, "lighthouse keeper");
    await publish(bob, bobsPublic);

    const hits = await db.as<{ author_id: string }>(alice, "select author_id from public.search_my_entries($1)", ["lighthouse"]);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.author_id === alice)).toBe(true);

    const wildcard = await db.as(alice, "select * from public.search_my_entries($1)", ["%"]);
    expect(wildcard).toHaveLength(0);
    await expect(db.as(null, "select * from public.search_my_entries('x')")).rejects.toThrow(/permission denied/);
  });
});

describe("likes, bookmarks and comments", () => {
  it("allow one like per user and only on public entries", async () => {
    const id = await newEntry(alice, "likeable");
    await expect(db.as(bob, "insert into public.likes (entry_id) values ($1)", [id])).rejects.toThrow(/row-level security/);
    await publish(alice, id);
    await db.as(bob, "insert into public.likes (entry_id) values ($1)", [id]);
    await expect(db.as(bob, "insert into public.likes (entry_id) values ($1)", [id])).rejects.toThrow(/duplicate key/);
    await expect(db.as(bob, "insert into public.likes (user_id, entry_id) values ($1, $2)", [alice, id])).rejects.toThrow(
      /row-level security/,
    );
  });

  it("hide likes and comments of entries that go private", async () => {
    const id = await newEntry(alice, "will vanish");
    await publish(alice, id);
    await db.as(bob, "insert into public.likes (entry_id) values ($1)", [id]);
    await db.as(bob, "insert into public.comments (entry_id, content) values ($1, 'lovely')", [id]);
    await unpublish(alice, id);
    expect(await db.as(null, "select * from public.likes where entry_id = $1", [id])).toHaveLength(0);
    expect(await db.as(bob, "select * from public.comments where entry_id = $1", [id])).toHaveLength(0);
    await expect(db.as(bob, "insert into public.comments (entry_id, content) values ($1, 'again')", [id])).rejects.toThrow(
      /row-level security/,
    );
  });

  it("allow each bookmark once and keep bookmarks private", async () => {
    const id = await newEntry(alice, "bookmarkable");
    await publish(alice, id);
    await db.as(bob, "insert into public.bookmarks (entry_id) values ($1)", [id]);
    await expect(db.as(bob, "insert into public.bookmarks (entry_id) values ($1)", [id])).rejects.toThrow(/duplicate key/);
    expect(await db.as(alice, "select * from public.bookmarks where user_id = $1", [bob])).toHaveLength(0);
    expect(await db.as(null, "select * from public.bookmarks")).toHaveLength(0);
  });

  it("enforce comment ownership and moderation by the entry author", async () => {
    const id = await newEntry(alice, "discuss");
    await publish(alice, id);
    const carol = await db.createUser("carol");
    const [c1] = await db.as<{ id: string }>(bob, "insert into public.comments (entry_id, content) values ($1, 'first') returning id", [id]);
    const [c2] = await db.as<{ id: string }>(bob, "insert into public.comments (entry_id, content) values ($1, 'second') returning id", [id]);

    await expect(db.as(bob, "insert into public.comments (entry_id, content) values ($1, '   ')", [id])).rejects.toThrow(
      /comments_content_length/,
    );
    await expect(
      db.as(bob, "insert into public.comments (entry_id, author_id, content) values ($1, $2, 'forged')", [id, carol]),
    ).rejects.toThrow(/row-level security/);

    expect(await db.as(carol, "update public.comments set content = 'edited' where id = $1 returning id", [c1.id])).toHaveLength(0);
    expect(await db.as(carol, "delete from public.comments where id = $1 returning id", [c1.id])).toHaveLength(0);
    expect(await db.as(bob, "update public.comments set content = 'edited' where id = $1 returning id", [c1.id])).toHaveLength(1);
    expect(await db.as(alice, "delete from public.comments where id = $1 returning id", [c2.id])).toHaveLength(1);
  });
});

describe("follows and blocks", () => {
  it("prevent self-follows and duplicates", async () => {
    await expect(db.as(alice, "insert into public.follows (following_id) values ($1)", [alice])).rejects.toThrow(/follows_no_self/);
    await db.as(alice, "insert into public.follows (following_id) values ($1)", [bob]);
    await expect(db.as(alice, "insert into public.follows (following_id) values ($1)", [bob])).rejects.toThrow(/duplicate key/);
    await expect(db.as(bob, "insert into public.follows (follower_id, following_id) values ($1, $1)", [alice])).rejects.toThrow();
  });

  it("blocking removes follows and stops interaction", async () => {
    const dave = await db.createUser("dave");
    const id = await newEntry(alice, "blocked readers");
    await publish(alice, id);
    await db.as(dave, "insert into public.follows (following_id) values ($1)", [alice]);
    await db.as(alice, "insert into public.blocks (blocked_id) values ($1)", [dave]);

    expect(await db.as(null, "select * from public.follows where follower_id = $1", [dave])).toHaveLength(0);
    await expect(db.as(dave, "insert into public.follows (following_id) values ($1)", [alice])).rejects.toThrow(/row-level security/);
    await expect(db.as(dave, "insert into public.comments (entry_id, content) values ($1, 'hi')", [id])).rejects.toThrow(
      /row-level security/,
    );
    expect(await db.as(dave, "select * from public.blocks")).toHaveLength(0);
  });
});

describe("reports", () => {
  it("can be filed but never read back by users", async () => {
    const id = await newEntry(alice, "reportable");
    await publish(alice, id);
    await db.as(bob, "insert into public.reports (entry_id, reason) values ($1, 'spam')", [id]);
    expect(await db.as(bob, "select * from public.reports")).toHaveLength(0);
    expect(await db.as(alice, "select * from public.reports")).toHaveLength(0);
  });

  it("cannot target private entries or several targets at once", async () => {
    const id = await newEntry(alice, "private target");
    await expect(db.as(bob, "insert into public.reports (entry_id, reason) values ($1, 'spam')", [id])).rejects.toThrow(
      /row-level security/,
    );
    await expect(
      db.as(bob, "insert into public.reports (profile_id, entry_id, reason) values ($1, $2, 'spam')", [alice, id]),
    ).rejects.toThrow();
  });
});

describe("deletion", () => {
  it("cascades to likes, comments and bookmarks", async () => {
    const id = await newEntry(alice, "short lived");
    await publish(alice, id);
    await db.as(bob, "insert into public.likes (entry_id) values ($1)", [id]);
    await db.as(bob, "insert into public.bookmarks (entry_id) values ($1)", [id]);
    await db.as(bob, "insert into public.comments (entry_id, content) values ($1, 'bye')", [id]);
    await db.as(alice, "delete from public.entries where id = $1", [id]);
    for (const table of ["likes", "bookmarks", "comments"]) {
      const res = await db.admin.query(`select 1 from public.${table} where entry_id = $1`, [id]);
      expect(res.rows).toHaveLength(0);
    }
  });
});
