import type { Metadata } from "next";
import { EntryEditor } from "@/components/editor/entry-editor";
import { requireViewer } from "@/lib/auth";
import { EMPTY_DOC } from "@/lib/content";
import { promptAt } from "@/lib/prompts";

export const metadata: Metadata = { title: "Write" };

export default async function NewEntryPage({ searchParams }: PageProps<"/write">) {
  await requireViewer("/write");
  const { prompt } = await searchParams;
  // The id is fixed for this editing session, so retried first saves can't duplicate.
  const id = crypto.randomUUID();
  return (
    <EntryEditor
      key={id}
      prompt={promptAt(prompt)}
      entry={{ id, title: "", content: EMPTY_DOC, revision: null, isPublic: false, everPublished: false, tags: [] }}
    />
  );
}
