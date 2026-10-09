import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryEditor } from "@/components/editor/entry-editor";
import { requireViewer } from "@/lib/auth";
import { EMPTY_DOC, isDocNode } from "@/lib/content";
import { getOwnEntry } from "@/lib/entries/queries";
import { isPublic } from "@/lib/entries/state";
import { entryIdSchema } from "@/lib/validation/entry";

export const metadata: Metadata = { title: "Write" };

export default async function EditEntryPage({ params }: PageProps<"/write/[id]">) {
  const { id } = await params;
  await requireViewer(`/write/${id}`);
  if (!entryIdSchema.safeParse(id).success) notFound();
  const entry = await getOwnEntry(id);
  if (!entry) notFound();

  return (
    <EntryEditor
      key={entry.id}
      entry={{
        id: entry.id,
        title: entry.title ?? "",
        content: isDocNode(entry.content_json) ? entry.content_json : EMPTY_DOC,
        revision: entry.revision,
        isPublic: isPublic(entry),
        everPublished: entry.published_at !== null,
        tags: entry.tags.map((t) => t.name),
      }}
    />
  );
}
