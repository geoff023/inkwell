"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { extractText } from "@/lib/content";
import { canPublish, publishedState, unpublishedState } from "@/lib/entries/state";
import { supabaseServer } from "@/lib/supabase/server";
import { entryIdSchema, saveEntrySchema, tagsSchema, type SaveEntryInput } from "@/lib/validation/entry";
import type { Json } from "@/types/database";

// All mutations run as the signed-in user; RLS rejects anything touching
// someone else's entry, and author_id is never taken from the client.

const MAX_TEXT_CHARS = 100_000;

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; reason: "unauthenticated" | "invalid" | "conflict" | "not_found" | "error"; message: string };

/**
 * Autosave. Creates the entry on first save using the client's stable id
 * (so retries can't create duplicates) and afterwards only writes if the
 * row is still at `baseRevision`, so an older save can never overwrite a
 * newer one.
 */
export async function saveEntry(input: SaveEntryInput): Promise<SaveResult> {
  if (!(await getUserId())) return { ok: false, reason: "unauthenticated", message: "You've been signed out. Log in to keep saving." };
  const parsed = saveEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid entry." };

  const { id, title, content, baseRevision } = parsed.data;
  const contentText = extractText(content);
  if (contentText.length > MAX_TEXT_CHARS) return { ok: false, reason: "invalid", message: "This entry is too long to save." };

  const supabase = await supabaseServer();
  const fields = { title, content_json: content as Json, content_text: contentText };

  if (baseRevision === null) {
    const { data, error } = await supabase.from("entries").insert({ id, ...fields }).select("revision, updated_at").single();
    if (data) return { ok: true, revision: data.revision, updatedAt: data.updated_at };
    // 23505: the first insert already landed but its response was lost.
    // Treat it as an update of the untouched first revision.
    if (error?.code !== "23505") return failed(error?.message);
  }

  const { data, error } = await supabase
    .from("entries")
    .update(fields)
    .eq("id", id)
    .eq("revision", baseRevision ?? 1)
    .select("revision, updated_at")
    .maybeSingle();
  if (error) return failed(error.message);
  if (data) return { ok: true, revision: data.revision, updatedAt: data.updated_at };

  const { data: exists } = await supabase.from("entries").select("id").eq("id", id).maybeSingle();
  return exists
    ? { ok: false, reason: "conflict", message: "This entry was changed somewhere else. Reload to get the latest version." }
    : { ok: false, reason: "not_found", message: "This entry no longer exists." };
}

function failed(detail?: string): SaveResult {
  console.error("saveEntry failed:", detail);
  return { ok: false, reason: "error", message: "Couldn't save. Try again." };
}

export type PublishResult = { ok: true; revision: number } | { ok: false; message: string };

/** Sets tags and visibility in one step from the publish panel. */
export async function updatePublication(input: { id: string; tags: string[]; makePublic: boolean }): Promise<PublishResult> {
  if (!(await getUserId())) return { ok: false, message: "You've been signed out. Log in and try again." };
  const id = entryIdSchema.safeParse(input.id);
  const tags = tagsSchema.safeParse(input.tags);
  if (!id.success) return { ok: false, message: "Unknown entry." };
  if (!tags.success) return { ok: false, message: tags.error.issues[0]?.message ?? "Invalid tags." };

  const supabase = await supabaseServer();
  const { data: entry } = await supabase.from("entries").select("title, content_text, status, visibility").eq("id", id.data).maybeSingle();
  if (!entry) return { ok: false, message: "This entry no longer exists." };
  if (input.makePublic && !canPublish(entry)) return { ok: false, message: "Write something before publishing." };

  const tagError = await replaceTags(supabase, id.data, tags.data);
  if (tagError) return { ok: false, message: "Couldn't save tags. Try again." };

  const next = input.makePublic ? publishedState() : unpublishedState(entry);
  const { data, error } = await supabase.from("entries").update(next).eq("id", id.data).select("revision").single();
  if (error) return { ok: false, message: "Couldn't update this entry. Try again." };

  revalidatePath("/", "layout");
  return { ok: true, revision: data.revision };
}

async function replaceTags(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  entryId: string,
  tags: { name: string; slug: string }[],
): Promise<boolean> {
  const { error: delError } = await supabase.from("entry_tags").delete().eq("entry_id", entryId);
  if (delError) return true;
  if (tags.length === 0) return false;

  const { error: upsertError } = await supabase.from("tags").upsert(tags, { onConflict: "slug", ignoreDuplicates: true });
  if (upsertError) return true;
  const { data: rows, error: selectError } = await supabase.from("tags").select("id").in("slug", tags.map((t) => t.slug));
  if (selectError || !rows) return true;
  const { error } = await supabase.from("entry_tags").insert(rows.map((r) => ({ entry_id: entryId, tag_id: r.id })));
  return Boolean(error);
}

export async function unpublishEntry(id: string): Promise<PublishResult> {
  if (!(await getUserId())) return { ok: false, message: "You've been signed out. Log in and try again." };
  const parsed = entryIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Unknown entry." };
  const supabase = await supabaseServer();
  const { data: entry } = await supabase.from("entries").select("status, visibility").eq("id", parsed.data).maybeSingle();
  if (!entry) return { ok: false, message: "This entry no longer exists." };
  const { data, error } = await supabase.from("entries").update(unpublishedState(entry)).eq("id", parsed.data).select("revision").single();
  if (error) return { ok: false, message: "Couldn't unpublish. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, revision: data.revision };
}

/** Form action for confirmed deletes. Likes, comments and bookmarks cascade in the database. */
export async function deleteEntry(fd: FormData): Promise<void> {
  if (!(await getUserId())) redirect("/login");
  const parsed = entryIdSchema.safeParse(fd.get("id"));
  if (!parsed.success) return;
  const supabase = await supabaseServer();
  const { error } = await supabase.from("entries").delete().eq("id", parsed.data);
  if (error) throw new Error("Couldn't delete this entry. Please try again.");
  revalidatePath("/", "layout");
  const redirectTo = fd.get("redirectTo");
  if (redirectTo === "/library" || redirectTo === "/journal") redirect(redirectTo);
}
