// Pure helpers for TipTap/ProseMirror JSON. No DOM, safe on server and client.

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

/** Largest stored document, as serialised JSON. Keeps rows and payloads sane. */
export const MAX_DOC_BYTES = 400_000;

const BLOCKS = new Set(["paragraph", "heading", "blockquote", "listItem", "bulletList", "orderedList", "horizontalRule"]);

export function isDocNode(value: unknown): value is DocNode {
  return typeof value === "object" && value !== null && (value as DocNode).type === "doc";
}

/** Plain text for search, previews and word counts. Blocks are separated by newlines. */
export function extractText(doc: unknown): string {
  if (!isDocNode(doc)) return "";
  const out: string[] = [];
  const walk = (node: DocNode) => {
    if (node.type === "text") out.push(node.text ?? "");
    else if (node.type === "hardBreak") out.push("\n");
    node.content?.forEach(walk);
    if (BLOCKS.has(node.type)) out.push("\n");
  };
  walk(doc);
  return out
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Whole minutes at ~220 words per minute, never below one for non-empty text. */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 220));
}

/** Collapsed single-paragraph preview, cut on a word boundary. */
export function excerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** Title to show for an entry; title-less pieces use their opening line. */
export function displayTitle(entry: { title: string | null; content_text: string }, max = 80): string {
  if (entry.title?.trim()) return entry.title.trim();
  const firstLine = entry.content_text.split("\n").find((l) => l.trim()) ?? "";
  return firstLine ? excerpt(firstLine, max) : "Untitled";
}

/** Only allow links that can't run script. Returns null for anything else. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return null;
}
