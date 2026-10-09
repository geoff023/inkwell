import { z } from "zod";

// Keyset pagination over (published_at, id), newest first. The cursor is an
// opaque base64url string; decoding validates both parts strictly because
// they are placed into a PostgREST filter.

const cursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() });

export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.at}|${c.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: unknown): Cursor | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  try {
    const [at, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    const parsed = cursorSchema.safeParse({ at, id });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** PostgREST `or` filter for rows strictly older than the cursor. */
export function olderThan(c: Cursor, column = "published_at"): string {
  return `${column}.lt."${c.at}",and(${column}.eq."${c.at}",id.lt.${c.id})`;
}
