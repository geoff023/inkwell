"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Clock, Eye, Globe, Lock, PenLine, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EntryBody } from "@/components/entries/entry-body";
import { buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { countWords, readingMinutes, safeHref, type DocNode } from "@/lib/content";
import { deleteEntry, saveCheckpoint } from "@/lib/entries/actions";
import { formatDuration, signed } from "@/lib/entries/history";
import { HistoryPanel, useHistoryPanel } from "./history-panel";
import { PublishPanel } from "./publish-panel";
import { Toolbar } from "./toolbar";
import { useAutosave, type SaveStatus, type Snapshot } from "./use-autosave";

export type EditorEntry = {
  id: string;
  title: string;
  content: DocNode;
  /** null until the entry exists in the database. */
  revision: number | null;
  isPublic: boolean;
  everPublished: boolean;
  tags: string[];
  writingSeconds: number;
};

export function EntryEditor({ entry, prompt }: { entry: EditorEntry; prompt?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(entry.title);
  const [isPublic, setIsPublic] = useState(entry.isPublic);
  const [everPublished, setEverPublished] = useState(entry.everPublished);
  const [tags, setTags] = useState(entry.tags);
  const [created, setCreated] = useState(entry.revision !== null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const previewing = snapshot !== null;
  const [words, setWords] = useState(0);
  const [panelPreview, setPanelPreview] = useState<{ title: string; content: DocNode } | null>(null);
  const titleRef = useRef(entry.title);
  const editorRef = useRef<Editor | null>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkpointing, setCheckpointing] = useState(false);
  const [historySeconds, setHistorySeconds] = useState(entry.writingSeconds);
  const history = useHistoryPanel(entry.id, historyRef);

  const getSnapshot = useCallback(() => {
    const ed = editorRef.current;
    return {
      title: titleRef.current,
      content: (ed ? ed.getJSON() : entry.content) as DocNode,
      empty: !titleRef.current.trim() && (ed ? ed.isEmpty : true),
    };
  }, [entry.content]);

  const onCreated = useCallback(() => {
    setCreated(true);
    // Keep the same editor mounted; just make the URL reloadable.
    window.history.replaceState(null, "", `/write/${entry.id}`);
  }, [entry.id]);

  const autosave = useAutosave({
    id: entry.id,
    initialRevision: entry.revision,
    initialWritingSeconds: entry.writingSeconds,
    getSnapshot,
    onCreated,
  });
  const { markDirty, flush } = autosave;

  const updateCount = (ed: Editor) => setWords(countWords(ed.state.doc.textBetween(0, ed.state.doc.content.size, "\n")));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["mailto"],
          isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && (!/^[a-z]+:/i.test(url) || safeHref(url) !== null),
        },
      }),
      Placeholder.configure({ placeholder: prompt ? "Begin anywhere…" : "Write what's on your mind…" }),
    ],
    content: entry.content,
    editorProps: {
      attributes: {
        class: "prose-ink min-h-[45vh] pb-24 focus:outline-none",
        "aria-label": "Entry body",
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
      updateCount(ed);
    },
    onUpdate: ({ editor: ed }) => {
      markDirty();
      updateCount(ed);
    },
  });

  // Ctrl/Cmd+S saves now instead of opening the browser's save dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  const leave = async (href: string) => {
    const ok = await flush();
    if (!ok && autosave.hasUnsaved() && !window.confirm("Some changes haven't been saved. Leave anyway?")) return;
    router.push(href);
  };

  // Clear the "Draft saved" note a few seconds after showing it.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const saveDraft = async () => {
    setCheckpointing(true);
    try {
      if (!(await flush())) return;
      if (!autosave.isCreated()) {
        setNotice("Nothing to save yet.");
        return;
      }
      const res = await saveCheckpoint(entry.id);
      if (!res.ok) setNotice(res.message);
      else if (res.unchanged) setNotice("No changes since your last save.");
      else {
        const parts = [signed(res.change.words, "word")];
        if (res.change.seconds > 0) parts.push(`${formatDuration(res.change.seconds)} writing`);
        setNotice(`Draft saved · ${parts.join(" · ")}`);
      }
    } catch {
      setNotice("Couldn't save. Check your connection.");
    } finally {
      setCheckpointing(false);
    }
  };

  const openHistory = () => {
    setHistorySeconds(autosave.writingSeconds());
    void history.open();
  };

  const openPanel = async () => {
    await flush();
    setPanelPreview(getSnapshot());
    panelRef.current?.showModal();
  };

  const canPublish = created && words > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30">
        <div className="border-b border-line bg-paper/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              <Link
                href="/library"
                onClick={(e) => {
                  e.preventDefault();
                  void leave("/library");
                }}
                className={buttonClass("ghost", "px-2")}
              >
                <ArrowLeft aria-hidden className="size-4" />
                <span className="hidden sm:inline">Library</span>
                <span className="sr-only sm:hidden">Back to library</span>
              </Link>
              <SaveIndicator status={autosave.status} error={autosave.error} notice={notice} onRetry={() => void flush()} />
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden text-xs text-muted sm:inline">
                {words} {words === 1 ? "word" : "words"}
                {words > 0 && ` · ${readingMinutes(words)} min read`}
              </span>
              <button
                type="button"
                onClick={() => setSnapshot(previewing ? null : getSnapshot())}
                aria-pressed={previewing}
                className={buttonClass("ghost", "px-2.5 aria-pressed:bg-paper-soft aria-pressed:text-ink")}
              >
                {previewing ? <PenLine aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                <span className="hidden sm:inline">{previewing ? "Edit" : "Preview"}</span>
                <span className="sr-only sm:hidden">{previewing ? "Back to editing" : "Preview"}</span>
              </button>
              {created && (
                <button type="button" onClick={openHistory} className={buttonClass("ghost", "px-2.5")} title="History">
                  <Clock aria-hidden className="size-4" />
                  <span className="sr-only">History and time spent</span>
                </button>
              )}
              {created && (
                <ConfirmDialog
                  trigger={
                    <>
                      <Trash2 aria-hidden className="size-4" />
                      <span className="sr-only">Delete entry</span>
                    </>
                  }
                  triggerClassName={buttonClass("ghost", "px-2.5")}
                  title="Delete this entry?"
                  description={
                    isPublic
                      ? "It will be removed from your profile and Discover, along with its likes and comments. This can't be undone."
                      : "This can't be undone."
                  }
                  confirmLabel="Delete"
                  pendingLabel="Deleting…"
                  action={deleteEntry}
                  fields={{ id: entry.id, redirectTo: "/library" }}
                />
              )}
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={checkpointing || autosave.status === "blocked"}
                className={buttonClass("secondary", "px-2.5 py-2 sm:px-4")}
              >
                <Save aria-hidden className="size-4" />
                <span className="hidden sm:inline">{checkpointing ? "Saving…" : "Save draft"}</span>
                <span className="sr-only sm:hidden">Save draft</span>
              </button>
              <button type="button" onClick={() => void openPanel()} disabled={!canPublish} className={buttonClass("primary", "px-4 py-2")}>
                {isPublic ? <Globe aria-hidden className="size-4" /> : null}
                {isPublic ? "Published" : "Publish"}
              </button>
            </div>
          </div>
        </div>
        {editor && !previewing && <Toolbar editor={editor} />}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 sm:px-8 sm:pt-12">
        <p className="mb-6 flex items-center gap-1.5 text-xs text-muted">
          {isPublic ? <Globe aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}
          {isPublic ? "Public. Anyone can read this." : everPublished ? "Unpublished. Only you can see this." : "Private draft. Only you can see this."}
          {tags.length > 0 && <span className="ml-1 truncate">· {tags.join(", ")}</span>}
        </p>

        {prompt && !previewing && <p className="mb-4 font-serif text-lg text-taupe italic">{prompt}</p>}

        <div hidden={previewing}>
          <label htmlFor="entry-title" className="sr-only">
            Title (optional)
          </label>
          <textarea
            id="entry-title"
            rows={1}
            value={title}
            maxLength={200}
            placeholder="Title (optional)"
            onChange={(e) => {
              setTitle(e.target.value);
              titleRef.current = e.target.value;
              markDirty();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            className="field-sizing-content w-full resize-none bg-transparent font-serif text-3xl leading-tight font-semibold text-ink placeholder:text-muted/50 focus:outline-none sm:text-4xl"
          />
          <div className="mt-6">
            <EditorContent editor={editor} />
          </div>
        </div>

        {snapshot && (
          <article className="pb-24">
            {snapshot.title.trim() && <h1 className="mb-8 font-serif text-3xl leading-tight font-semibold sm:text-4xl">{snapshot.title}</h1>}
            {snapshot.empty ? <p className="text-muted">Nothing to preview yet.</p> : <EntryBody doc={snapshot.content} />}
          </article>
        )}
      </main>

      <HistoryPanel dialogRef={historyRef} items={history.items} error={history.error} totalSeconds={historySeconds} words={words} />

      <PublishPanel
        dialogRef={panelRef}
        entryId={entry.id}
        isPublic={isPublic}
        tags={tags}
        preview={panelPreview}
        beforeSubmit={flush}
        onDone={(res) => {
          autosave.setRevision(res.revision);
          setIsPublic(res.isPublic);
          if (res.isPublic) setEverPublished(true);
          setTags(res.tags);
        }}
      />
    </div>
  );
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "Not saved yet",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save.",
  blocked: "Not saving",
};

function SaveIndicator({
  status,
  error,
  notice,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  notice: string | null;
  onRetry: () => void;
}) {
  const failed = status === "error" || status === "blocked";
  if (notice && !failed) {
    return (
      <p role="status" aria-live="polite" className="truncate text-xs text-ink">
        {notice}
      </p>
    );
  }
  return (
    <p role="status" aria-live="polite" className={`flex min-w-0 items-center gap-2 text-xs ${failed ? "text-danger" : "text-muted"}`}>
      <span className="truncate" title={failed ? (error ?? undefined) : undefined}>
        {status === "blocked" && error ? error : STATUS_TEXT[status]}
      </span>
      {status === "error" && (
        <button type="button" onClick={onRetry} className="shrink-0 underline underline-offset-2">
          Try again
        </button>
      )}
    </p>
  );
}
