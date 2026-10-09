import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Minimal stand-in for the parts of Supabase the migrations rely on: the anon
// and authenticated roles, auth.users, auth.uid() and Supabase's default
// grants. RLS then behaves as it does in a real project.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    instance_id uuid,
    aud text,
    role text,
    email text,
    encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb not null default '{}',
    created_at timestamptz,
    updated_at timestamptz,
    confirmation_token text,
    recovery_token text,
    email_change text,
    email_change_token_new text
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export type Db = Awaited<ReturnType<typeof createDb>>;

export async function createDb() {
  const pg = await PGlite.create();
  await pg.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    await pg.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  /** Run one statement as a visitor (null) or a signed-in user, with RLS on. */
  async function as<T = Record<string, unknown>>(
    userId: string | null,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return pg.transaction(async (tx) => {
      await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      const res = await tx.query<T>(sql, params);
      return res.rows;
    });
  }

  /** Sign up a user the way Supabase Auth does, firing the profile trigger. */
  async function createUser(username: string): Promise<string> {
    const res = await pg.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
      [`${username}@example.test`, { username, display_name: username }],
    );
    return res.rows[0].id;
  }

  /** Loads supabase/seed.sql the way `supabase db reset` does. */
  async function seed() {
    await pg.exec(readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8"));
  }

  /** Superuser access for arranging fixtures. Bypasses RLS. */
  const admin = pg;

  return { as, createUser, seed, admin, close: () => pg.close() };
}
