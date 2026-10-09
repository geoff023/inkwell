import { describe, expect, it } from "vitest";
import { countWords, displayTitle, excerpt, extractText, readingMinutes, safeHref } from "@/lib/content";
import { canPublish, isPublic, publishedState, stateLabel, unpublishedState } from "@/lib/entries/state";
import { saveEntrySchema, slugify, tagsSchema } from "@/lib/validation/entry";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "A morning" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Rain on the " },
        { type: "text", text: "window", marks: [{ type: "bold" }] },
        { type: "text", text: "." },
        { type: "hardBreak" },
        { type: "text", text: "Tea going cold." },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }] },
    { type: "horizontalRule" },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quoted" }] }] },
  ],
};

describe("extractText", () => {
  it("joins blocks with newlines and keeps inline text together", () => {
    expect(extractText(doc)).toBe("A morning\nRain on the window.\nTea going cold.\none\nquoted");
  });

  it("returns empty text for empty or invalid documents", () => {
    expect(extractText({ type: "doc", content: [] })).toBe("");
    expect(extractText(null)).toBe("");
    expect(extractText({ type: "paragraph" })).toBe("");
  });
});

describe("word count and reading time", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  one\ntwo   three ")).toBe(3);
  });

  it("rounds reading time with a one-minute floor", () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(660)).toBe(3);
  });
});

describe("excerpt and displayTitle", () => {
  it("cuts long text on a word boundary", () => {
    const out = excerpt("word ".repeat(100), 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("word…")).toBe(true);
  });

  it("uses the title, else the first line, else Untitled", () => {
    expect(displayTitle({ title: "  Kept  ", content_text: "body" })).toBe("Kept");
    expect(displayTitle({ title: null, content_text: "\nFirst line\nsecond" })).toBe("First line");
    expect(displayTitle({ title: "", content_text: "" })).toBe("Untitled");
  });
});

describe("safeHref", () => {
  it.each(["https://example.com", "http://a.b/c?d", "mailto:hi@example.com"])("allows %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });

  it.each(["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "/relative", "//evil.test", 42])("rejects %j", (href) => {
    expect(safeHref(href)).toBeNull();
  });
});

describe("tags", () => {
  it("slugifies names", () => {
    expect(slugify("  Personal Growth! ")).toBe("personal-growth");
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
    expect(slugify("!!!")).toBe("");
  });

  it("dedupes by slug, drops empties and strips #", () => {
    expect(tagsSchema.parse(["#Poetry", "poetry", " ", "Late nights"])).toEqual([
      { slug: "poetry", name: "Poetry" },
      { slug: "late-nights", name: "Late nights" },
    ]);
  });

  it("limits the number of tags", () => {
    expect(tagsSchema.safeParse(["a", "b", "c", "d", "e", "f"]).success).toBe(false);
  });
});

describe("saveEntrySchema", () => {
  const base = { id: "7b0b3c1e-6f1a-4c63-9d9f-4d8a3f1b2c10", title: "  ", content: doc, baseRevision: null };

  it("turns blank titles into null", () => {
    expect(saveEntrySchema.parse(base).title).toBeNull();
  });

  it("rejects non-documents, bad ids and oversized documents", () => {
    expect(saveEntrySchema.safeParse({ ...base, content: { type: "paragraph" } }).success).toBe(false);
    expect(saveEntrySchema.safeParse({ ...base, id: "not-a-uuid" }).success).toBe(false);
    const huge = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(500_000) }] }] };
    expect(saveEntrySchema.safeParse({ ...base, content: huge }).success).toBe(false);
  });
});

describe("visibility and publication transitions", () => {
  it("publishes to public and unpublishes back to private", () => {
    expect(publishedState()).toEqual({ status: "published", visibility: "public" });
    expect(unpublishedState({ status: "published", visibility: "public" })).toEqual({ status: "unpublished", visibility: "private" });
  });

  it("keeps never-published drafts as drafts", () => {
    expect(unpublishedState({ status: "draft", visibility: "private" })).toEqual({ status: "draft", visibility: "private" });
  });

  it("only treats published public entries as public", () => {
    expect(isPublic({ status: "published", visibility: "public" })).toBe(true);
    expect(isPublic({ status: "published", visibility: "selected" })).toBe(false);
    expect(isPublic({ status: "draft", visibility: "private" })).toBe(false);
    expect(stateLabel({ status: "unpublished", visibility: "private" })).toBe("Unpublished");
  });

  it("requires body text to publish, title optional", () => {
    expect(canPublish({ title: null, content_text: "a short thought" })).toBe(true);
    expect(canPublish({ title: "Only a title", content_text: "  " })).toBe(false);
  });
});
