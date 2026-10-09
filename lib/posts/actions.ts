"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ReportReason } from "@/types/database";

// Social mutations. user ids always come from the session (the columns
// default to auth.uid() and RLS checks them); the client only names targets.

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; message: string; needsLogin?: boolean };

const id = z.uuid();
const SIGNED_OUT = { ok: false, message: "Log in to do that.", needsLogin: true } as const;
const isDuplicate = (code?: string) => code === "23505";

async function session() {
  const userId = await getUserId();
  return userId ? { userId, supabase: await supabaseServer() } : null;
}

/** Sets (not toggles) the like, so repeated clicks are idempotent. Returns the fresh count. */
export async function setLike(entryId: string, like: boolean): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  if (!id.safeParse(entryId).success) return { ok: false, message: "Unknown post." };

  const { error } = like
    ? await s.supabase.from("likes").insert({ entry_id: entryId })
    : await s.supabase.from("likes").delete().eq("entry_id", entryId).eq("user_id", s.userId);
  if (error && !isDuplicate(error.code)) return { ok: false, message: "Couldn't update your like. Try again." };

  const { count } = await s.supabase.from("likes").select("*", { count: "exact", head: true }).eq("entry_id", entryId);
  return { ok: true, liked: like, count: count ?? 0 };
}

export async function setBookmark(entryId: string, save: boolean): Promise<ActionResult<{ bookmarked: boolean }>> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  if (!id.safeParse(entryId).success) return { ok: false, message: "Unknown post." };

  const { error } = save
    ? await s.supabase.from("bookmarks").insert({ entry_id: entryId })
    : await s.supabase.from("bookmarks").delete().eq("entry_id", entryId).eq("user_id", s.userId);
  if (error && !isDuplicate(error.code)) return { ok: false, message: "Couldn't update your saved posts. Try again." };
  revalidatePath("/saved");
  return { ok: true, bookmarked: save };
}

const commentText = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(2000, "Keep comments under 2,000 characters.");

export async function addComment(entryId: string, content: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  const parsed = commentText.safeParse(content);
  if (!id.safeParse(entryId).success) return { ok: false, message: "Unknown post." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { error } = await s.supabase.from("comments").insert({ entry_id: entryId, content: parsed.data });
  // RLS rejects comments on posts that are no longer public, or across a block.
  if (error) return { ok: false, message: error.code === "42501" ? "Comments aren't available on this post." : "Couldn't post your comment. Try again." };
  revalidatePath(`/post/${entryId}`);
  return { ok: true };
}

export async function editComment(commentId: string, content: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  const parsed = commentText.safeParse(content);
  if (!id.safeParse(commentId).success) return { ok: false, message: "Unknown comment." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { data, error } = await s.supabase.from("comments").update({ content: parsed.data }).eq("id", commentId).select("entry_id").maybeSingle();
  if (error || !data) return { ok: false, message: "Couldn't update this comment." };
  revalidatePath(`/post/${data.entry_id}`);
  return { ok: true };
}

/** Comment authors can delete their own; post authors can remove any on their posts (RLS). */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  if (!id.safeParse(commentId).success) return { ok: false, message: "Unknown comment." };

  const { data, error } = await s.supabase.from("comments").delete().eq("id", commentId).select("entry_id").maybeSingle();
  if (error || !data) return { ok: false, message: "Couldn't delete this comment." };
  revalidatePath(`/post/${data.entry_id}`);
  return { ok: true };
}

export async function setFollow(profileId: string, follow: boolean): Promise<ActionResult<{ following: boolean }>> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  if (!id.safeParse(profileId).success) return { ok: false, message: "Unknown writer." };
  if (profileId === s.userId) return { ok: false, message: "You can't follow yourself." };

  const { error } = follow
    ? await s.supabase.from("follows").insert({ following_id: profileId })
    : await s.supabase.from("follows").delete().eq("follower_id", s.userId).eq("following_id", profileId);
  if (error && !isDuplicate(error.code)) return { ok: false, message: "Couldn't update. Try again." };
  revalidatePath("/u/[username]", "page");
  return { ok: true, following: follow };
}

export async function setBlock(profileId: string, block: boolean): Promise<ActionResult<{ blocked: boolean }>> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  if (!id.safeParse(profileId).success || profileId === s.userId) return { ok: false, message: "Unknown writer." };

  const { error } = block
    ? await s.supabase.from("blocks").insert({ blocked_id: profileId })
    : await s.supabase.from("blocks").delete().eq("blocker_id", s.userId).eq("blocked_id", profileId);
  if (error && !isDuplicate(error.code)) return { ok: false, message: "Couldn't update. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, blocked: block };
}

const REASONS = ["spam", "harassment", "hate", "self_harm", "sexual", "other"] as const satisfies readonly ReportReason[];

const reportSchema = z.object({
  target: z.enum(["entry", "comment", "profile"]),
  targetId: z.uuid(),
  reason: z.enum(REASONS),
  details: z.string().trim().max(1000, "Keep details under 1,000 characters.").optional(),
});

export async function fileReport(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const s = await session();
  if (!s) return SIGNED_OUT;
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { target, targetId, reason, details } = parsed.data;

  const { error } = await s.supabase.from("reports").insert({
    entry_id: target === "entry" ? targetId : null,
    comment_id: target === "comment" ? targetId : null,
    profile_id: target === "profile" ? targetId : null,
    reason,
    details: details || null,
  });
  if (error) return { ok: false, message: "Couldn't send this report. Try again." };
  return { ok: true };
}
