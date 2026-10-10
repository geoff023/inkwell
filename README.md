# Inkwell

*For the words that need somewhere to go.*

Inkwell is a private journal and a small literary community in one place. Write short thoughts, diary entries, poems or longer pieces. Everything starts private; publish what you choose, unpublish it whenever you like, and read what other people decided to share.

## Features

- **Writing editor**: TipTap rich text (headings, bold, italic, underline, strikethrough, lists, quotes, links, dividers, undo/redo), optional titles, word count and reading time, preview, and autosave that only says "Saved" once the latest edit is stored.
- **Private by default**: new entries are private drafts. Publishing is a separate, explicit step, and the database enforces it.
- **Journal**: private entries and drafts grouped by day, with search and tag filters.
- **Library**: everything you've written, filtered by status (draft, published, unpublished) and visibility, with search over titles, text and tags.
- **Home**: greeting, a gentle daily prompt, quick actions and recent writing.
- **Discover**: text-first feed of public writing, with Latest and Following tabs, a topic filter and cursor pagination.
- **Reading page**: formatted post with likes, bookmarks, chronological comments (edit or delete your own; authors can remove comments on their posts) and reporting.
- **Profiles**: published writing, bio, follower and following counts, follow, block and report.
- **Saved**: private bookmarks.
- **Settings**: edit display name, username, bio and interests; change password; log out; delete account.
- **Accounts**: email and password sign-up, login, logout, password reset and a short onboarding.

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 · TipTap 3 · Supabase (Postgres, Auth, RLS) · Zod · Lucide · Vitest + PGlite · Playwright

## Prerequisites

- Node.js 20.9 or newer (developed on Node 24) and npm.
- A Supabase project. Use either:
  - **Local**: the Supabase CLI (installed as a dev dependency) plus Docker Desktop, or
  - **Hosted**: a free project at [supabase.com](https://supabase.com).

## Setup

```bash
npm install
cp .env.example .env.local
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`http://127.0.0.1:54321` locally) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon (publishable) key |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, used in email links (`http://localhost:3000` locally) |

The app never uses a service-role key. Every query runs as the signed-in user, and row level security enforces access.

### Option A: local Supabase (Docker)

```bash
npm run db:start      # starts Postgres, Auth and Studio; prints the URL and anon key
npm run db:reset      # applies supabase/migrations and loads supabase/seed.sql
```

Copy the printed `API URL` and `anon key` into `.env.local`. Local auth has email confirmation turned off, so sign-up logs you in straight away. Emails, such as password resets, appear in Mailpit at http://127.0.0.1:54324.

### Option B: hosted Supabase

1. Create a project, then copy its URL and anon key into `.env.local`.
2. Apply the schema. Either:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   or paste `supabase/migrations/20261010000000_init.sql` into the SQL editor and run it.
3. In **Authentication → URL Configuration**, set **Site URL** to your app URL and add `<site-url>/auth/confirm` to the redirect URLs.
4. Email confirmation is optional. If it's on, new users are asked to confirm before logging in.

**Do not run `supabase/seed.sql` against a real project.** It creates fictional sample writers for local development only.

## Running

```bash
npm run dev           # http://localhost:3000
```

## Tests and checks

```bash
npm run typecheck     # route type generation + tsc --noEmit
npm run lint          # ESLint
npm test              # Vitest: unit tests + database security tests
npm run build         # production build (needs the env vars)
npm run test:e2e      # Playwright end-to-end journey (needs a running Supabase)
```

- **Database security tests** (`tests/db/`) apply the real migrations to an in-process Postgres ([PGlite](https://pglite.dev)) with a small stand-in for Supabase's `auth` schema and roles. They then run as visitors and as different users to check the access rules: private entries hidden from others, no cross-user edits, unpublishing hiding posts again, no duplicate likes or bookmarks, no self-follows, comment ownership and moderation, blocks, reports nobody can read back, cascading deletes, stale-save protection, and the seed. They need no Docker. They do not exercise Supabase's API layer or Auth itself, so also run the end-to-end test against a real Supabase before deploying.
- **End-to-end test** (`e2e/workflow.spec.ts`): sign up, write a private entry, reload, edit, publish, check Discover and the profile, sign up a second user, like, comment, follow, check the private entry is unreachable, unpublish, and check logged-out redirects. First time only, run `npx playwright install chromium`.

## Project structure

```
app/                  routes: (main) shell pages, (auth) forms, write/ editor, onboarding/
components/editor/    TipTap editor, toolbar, autosave hook, publish panel
components/entries/   allow-listed content renderer, own-entry lists
components/feed/      post cards
components/social/    like/bookmark/follow/block buttons, comments, report dialog
components/shell/     header, navigation
components/ui/        buttons, form fields, confirm dialog
lib/auth.ts           server-side session and viewer helpers
lib/entries/          own-writing queries, mutations, state transitions
lib/posts/            public feed queries, social mutations, cursor
lib/validation/       Zod schemas
lib/supabase/         browser, server and proxy clients
supabase/             config, migrations, seed
tests/                Vitest unit and database tests
e2e/                  Playwright tests
proxy.ts              session refresh and redirects for signed-out visitors
```

## Data model and security

The main tables are `profiles`, `entries`, `tags`, `entry_tags`, `likes`, `comments`, `follows`, `bookmarks`, `blocks` and `reports`. Every table has RLS enabled. Highlights:

- **Entry states** are limited by a check constraint to three combinations:
  - `draft` + `private`
  - `published` + `public`
  - `unpublished` + `private`

  Inserts must be private drafts; publishing is an explicit update. The database owns `published_at` (set once, kept through unpublishing) and `revision`. The editor uses `revision` to refuse stale saves from other tabs.
- **Visibility rules**:
  - Others can read an entry only when it is `published` and `public`. Likes, comments and tags inherit the visibility of their entry, so making a post private hides them all straight away.
  - Bookmarks and blocks are readable only by their owner. Reports can be filed, but users can never read them.
  - Profiles hold no email; email stays in `auth.users`.
- **Writes** are checked against `auth.uid()`; ids sent by the browser are never trusted.
  - You can only like, comment on or bookmark posts that are public.
  - Blocking stops the blocked person from following you, liking or commenting.
  - Follows can't point at yourself, and likes, bookmarks and follows can't be duplicated.
- **Search** goes through `search_my_entries`. It runs as the caller, only covers their own entries, and escapes `%` and `_` so they're treated literally.
- **Privileged functions**: only three, each with a fixed `search_path` and limited execute rights:
  - `handle_new_user` creates the profile on sign-up.
  - `is_blocked_between` answers a yes/no question about blocks.
  - `delete_my_account` deletes the caller's own account.
- **Rendering**: published content is rendered from stored JSON through an allow-list of elements, with links limited to `http(s)` and `mailto`, so stored content can't inject markup.
- Private writing is private application data, protected by authentication and access rules. It is **not** end-to-end encrypted.

## Deployment

Deploy to any Node host that supports Next.js, such as Vercel. Set the three environment variables, apply the migration to the production database, and set the Supabase Site URL and redirect URL to the production domain.

## Known limitations

- "Selected people" visibility exists in the schema but is not offered in the app. No policy grants access to it, so it stays author-only.
- No moderation dashboard. Reports are stored for review through Supabase Studio or SQL.
- Avatars show initials; image upload isn't implemented.
- Journal and library show the newest 200 entries, comments the first 500, and saved posts the newest 200. Pagination for these is not built yet.
- Dates, day grouping and the greeting use the server's time zone.
- `delete_my_account` deletes from `auth.users` using the function owner's rights. Check it on your Supabase project before relying on it.
- The database security tests run on PGlite; the end-to-end test needs a real Supabase and wasn't part of the automated checks here.
