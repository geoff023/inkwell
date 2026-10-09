import { z } from "zod";
import { isDocNode, MAX_DOC_BYTES } from "@/lib/content";

export const entryIdSchema = z.uuid();

const docSchema = z.custom<Record<string, unknown>>(isDocNode, "Invalid document.").refine(
  (doc) => JSON.stringify(doc).length <= MAX_DOC_BYTES,
  "This entry is too long to save.",
);

export const saveEntrySchema = z.object({
  id: entryIdSchema,
  title: z
    .string()
    .max(200, "Keep the title under 200 characters.")
    .transform((t) => t.trim() || null),
  content: docSchema,
  baseRevision: z.number().int().positive().nullable(),
});

export type SaveEntryInput = z.input<typeof saveEntrySchema>;

export const MAX_TAGS = 5;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Parses free-form tag input into unique { name, slug } pairs. */
export const tagsSchema = z
  .array(z.string())
  .transform((raw) => {
    const seen = new Map<string, string>();
    for (const name of raw.map((t) => t.trim().replace(/^#/, "").slice(0, 40))) {
      const slug = slugify(name);
      if (slug && !seen.has(slug)) seen.set(slug, name);
    }
    return [...seen].map(([slug, name]) => ({ slug, name }));
  })
  .refine((tags) => tags.length <= MAX_TAGS, `Use at most ${MAX_TAGS} tags.`);
