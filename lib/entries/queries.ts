import "server-only";

import { requireViewer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { EntryStatus, EntryVisibility } from "@/types/database";

// Reads of the signed-in author's own writing. Every query is scoped to the
// viewer's id on top of RLS, so other people's public posts never mix in.

const OWN_ENTRY_FIELDS =
  "id, title, content_text, status, visibility, created_at, updated_at, published_at, entry_tags(tags(name, slug))" as const;

export type OwnEntrySummary = {
  id: string;
  title: string | null;
  content_text: string;
  status: EntryStatus;
  visibility: EntryVisibility;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  tags: { name: string; slug: string }[];
};

type Row = Omit<OwnEntrySummary, "tags"> & { entry_tags: { tags: { name: string; slug: string } | null }[] };

const withTags = (rows: Row[]): OwnEntrySummary[] =>
  rows.map(({ entry_tags, ...rest }) => ({ ...rest, tags: entry_tags.flatMap((et) => (et.tags ? [et.tags] : [])) }));

export type OwnEntryFilter = {
  q?: string;
  status?: EntryStatus;
  visibility?: "private" | "public";
  limit?: number;
};

// ponytail: fixed page of the newest entries; add cursor pagination when
// someone's archive outgrows it.
const DEFAULT_LIMIT = 200;

export async function listOwnEntries(filter: OwnEntryFilter = {}): Promise<OwnEntrySummary[]> {
  const viewer = await requireViewer();
  const supabase = await supabaseServer();
  const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, DEFAULT_LIMIT);
  const q = filter.q?.trim();

  // search_my_entries returns entries rows, so the same filters and embeds apply.
  let query = q
    ? supabase.rpc("search_my_entries", { q, max_rows: 100 }).select(OWN_ENTRY_FIELDS)
    : supabase.from("entries").select(OWN_ENTRY_FIELDS).order("updated_at", { ascending: false });

  query = query.eq("author_id", viewer.id).limit(limit);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.visibility) query = query.eq("visibility", filter.visibility);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load your writing: ${error.message}`);
  return withTags(data as unknown as Row[]);
}

export async function getOwnEntry(id: string) {
  const viewer = await requireViewer();
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("entries")
    .select("*, entry_tags(tags(name, slug))")
    .eq("id", id)
    .eq("author_id", viewer.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load this entry: ${error.message}`);
  if (!data) return null;
  const { entry_tags, ...entry } = data;
  return { ...entry, tags: entry_tags.flatMap((et) => (et.tags ? [et.tags] : [])) };
}

export type OwnEntry = NonNullable<Awaited<ReturnType<typeof getOwnEntry>>>;
