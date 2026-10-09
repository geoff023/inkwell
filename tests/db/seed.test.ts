import { afterAll, beforeAll, expect, it } from "vitest";
import { createDb, type Db } from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  await db.seed();
});

afterAll(async () => {
  await db.close();
});

it("seeds public posts, and its private draft stays hidden from visitors", async () => {
  const visible = await db.as<{ title: string | null }>(null, "select title from public.entries");
  expect(visible).toHaveLength(8);
  expect(visible.map((v) => v.title)).not.toContain("Not for anyone");

  const [{ count }] = await db.admin.query<{ count: number }>("select count(*)::int as count from public.entries").then((r) => r.rows);
  expect(count).toBe(9);
});

it("seeds valid profiles, tags and interactions", async () => {
  const profiles = await db.as<{ username: string }>(null, "select username from public.profiles order by username");
  expect(profiles.map((p) => p.username)).toEqual(["idris", "june_ocampo", "tomas_v", "wren_h"]);
  expect(await db.as(null, "select * from public.entry_tags")).not.toHaveLength(0);
  expect(await db.as(null, "select * from public.likes")).toHaveLength(5);
  expect(await db.as(null, "select * from public.comments")).toHaveLength(2);
});
