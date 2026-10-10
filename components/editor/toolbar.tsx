"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { safeHref } from "@/lib/content";

type Tool = {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  disabled?: (e: Editor) => boolean;
};

// Text styles map onto the stored schema: Title = heading 1, Subtitle =
// heading 2 (rendered lighter and grey), Content = paragraph.
const TEXT_STYLES = [
  { value: "content", label: "Content", run: (e: Editor) => e.chain().focus().setParagraph().run() },
  { value: "title", label: "Title", run: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run() },
  { value: "subtitle", label: "Subtitle", run: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run() },
] as const;

const textStyleOf = (e: Editor) =>
  e.isActive("heading", { level: 1 }) ? "title" : e.isActive("heading", { level: 2 }) ? "subtitle" : "content";

const GROUPS: Tool[][] = [
  [
    { label: "Bold", shortcut: "Ctrl+B", icon: Bold, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    { label: "Italic", shortcut: "Ctrl+I", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
    { label: "Underline", shortcut: "Ctrl+U", icon: Underline, run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
    { label: "Strikethrough", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  ],
  [
    { label: "Bullet list", icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { label: "Numbered list", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
    { label: "Quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
    { label: "Divider", icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
  ],
  [
    { label: "Undo", shortcut: "Ctrl+Z", icon: Undo2, run: (e) => e.chain().focus().undo().run(), disabled: (e) => !e.can().undo() },
    { label: "Redo", shortcut: "Ctrl+Shift+Z", icon: Redo2, run: (e) => e.chain().focus().redo().run(), disabled: (e) => !e.can().redo() },
  ],
];

const TOOLS = GROUPS.flat();

const buttonClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper-soft hover:text-ink aria-pressed:bg-sand/60 aria-pressed:text-ink disabled:opacity-35 disabled:hover:bg-transparent";

export function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: TOOLS.map((t) => t.active?.(e) ?? false),
      disabled: TOOLS.map((t) => t.disabled?.(e) ?? false),
      link: e.isActive("link"),
      textStyle: textStyleOf(e),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const applyLink = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const raw = String(new FormData(ev.currentTarget).get("href") ?? "").trim();
    if (!raw) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = safeHref(/^[a-z]+:/i.test(raw) ? raw : `https://${raw}`);
    if (!href) {
      setLinkError("Use a web address starting with https:// or a mailto: link.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  };

  let index = 0;
  return (
    <div className="border-b border-line bg-paper/95 backdrop-blur-sm">
      <div role="toolbar" aria-label="Formatting" className="mx-auto flex max-w-6xl items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] sm:px-6">
        <label htmlFor="text-style" className="sr-only">
          Text style
        </label>
        <select
          id="text-style"
          value={state.textStyle}
          onChange={(e) => TEXT_STYLES.find((t) => t.value === e.target.value)?.run(editor)}
          className="h-9 shrink-0 cursor-pointer rounded-md border border-line bg-white px-2 text-sm text-ink focus:border-taupe focus:outline-none"
        >
          {TEXT_STYLES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {GROUPS.map((group, g) => (
          <div key={g} className="flex items-center gap-0.5">
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />
            {group.map((tool) => {
              const i = index++;
              const Icon = tool.icon;
              const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;
              return (
                <button
                  key={tool.label}
                  type="button"
                  title={title}
                  aria-label={tool.label}
                  aria-pressed={tool.active ? state.active[i] : undefined}
                  disabled={state.disabled[i]}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => tool.run(editor)}
                  className={buttonClass}
                >
                  <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
                </button>
              );
            })}
            {g === 0 && (
              <button
                type="button"
                title="Link"
                aria-label="Link"
                aria-pressed={state.link}
                aria-expanded={linkOpen}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLinkError(null);
                  setLinkOpen((o) => !o);
                }}
                className={buttonClass}
              >
                <Link2 aria-hidden className="size-4.5" strokeWidth={1.8} />
              </button>
            )}
          </div>
        ))}
      </div>
      {linkOpen && (
        <form onSubmit={applyLink} className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-2.5 sm:px-6">
          <label htmlFor="link-href" className="sr-only">
            Link address
          </label>
          <input
            id="link-href"
            name="href"
            type="text"
            inputMode="url"
            autoFocus
            defaultValue={state.href}
            placeholder="https://"
            aria-invalid={linkError ? true : undefined}
            aria-describedby={linkError ? "link-error" : undefined}
            onKeyDown={(e) => e.key === "Escape" && setLinkOpen(false)}
            className="min-w-0 flex-1 rounded-md border border-line bg-white px-3 py-1.5 text-sm focus:border-taupe focus:outline-none"
          />
          <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper">
            {state.link ? "Update" : "Add link"}
          </button>
          {state.link && (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkOpen(false);
              }}
              className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Remove
            </button>
          )}
          {linkError && (
            <p id="link-error" className="w-full text-xs text-danger">
              {linkError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
