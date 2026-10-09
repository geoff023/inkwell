import type { EntryStatus, EntryVisibility } from "@/types/database";

type EntryState = { status: EntryStatus; visibility: EntryVisibility };

/**
 * The only two visibility transitions the app performs. The database's
 * entries_state_valid constraint rejects every other combination.
 */
export function publishedState(): EntryState {
  return { status: "published", visibility: "public" };
}

export function unpublishedState(current: EntryState): EntryState {
  // A draft that was never published stays a draft.
  return { status: current.status === "draft" ? "draft" : "unpublished", visibility: "private" };
}

export function isPublic(entry: EntryState): boolean {
  return entry.status === "published" && entry.visibility === "public";
}

export function canPublish(entry: { title: string | null; content_text: string }): boolean {
  return entry.content_text.trim().length > 0;
}

export function stateLabel(entry: EntryState): string {
  if (isPublic(entry)) return "Published";
  if (entry.status === "unpublished") return "Unpublished";
  return "Private draft";
}
