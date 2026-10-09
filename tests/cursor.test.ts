import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, olderThan } from "@/lib/posts/cursor";

const cursor = { at: "2026-10-10T02:35:51.123456+00:00", id: "7b0b3c1e-6f1a-4c63-9d9f-4d8a3f1b2c10" };

describe("feed cursor", () => {
  it("round-trips Postgres timestamps and ids", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("builds a keyset filter with quoted timestamps", () => {
    expect(olderThan(cursor)).toBe(
      `published_at.lt."${cursor.at}",and(published_at.eq."${cursor.at}",id.lt.${cursor.id})`,
    );
  });

  it.each([
    undefined,
    "",
    "not base64 at all!",
    encodeCursor({ ...cursor, id: "x),author_id.neq.(" }),
    Buffer.from(`${cursor.at}),status.eq.draft|${cursor.id}`).toString("base64url"),
    "a".repeat(500),
  ])("rejects malformed or injected cursors (%#)", (raw) => {
    expect(decodeCursor(raw)).toBeNull();
  });
});
