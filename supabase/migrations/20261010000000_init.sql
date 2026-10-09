-- Inkwell schema, constraints and row level security.
--
-- Entry state model (enforced by entries_state_valid):
--   draft        + private  -> never published, only the author can read it
--   published    + public   -> readable by everyone
--   unpublished  + private  -> was published once, now back to author-only
-- Publication is an explicit transition done by an UPDATE; inserts are always
-- private drafts. 'selected' visibility exists for a future "selected people"
-- feature. No policy grants it to anyone except the author yet.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.entry_visibility as enum ('private', 'public', 'selected');
create type public.entry_status as enum ('draft', 'published', 'unpublished');
create type public.report_reason as enum ('spam', 'harassment', 'hate', 'self_harm', 'sexual', 'other');
create type public.report_status as enum ('open', 'reviewed', 'dismissed');

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: public author data. Email lives only in auth.users.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null
    constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 60),
  bio text
    constraint profiles_bio_length check (bio is null or char_length(bio) <= 280),
  avatar_url text
    constraint profiles_avatar_url_format check (avatar_url is null or avatar_url ~ '^https://'),
  interests text[] not null default '{}'
    constraint profiles_interests_count check (cardinality(interests) <= 12),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Creates the profile row from sign-up metadata. Runs as the table owner
-- because the inserting role (supabase_auth_admin) has no rights on public.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text
    constraint entries_title_length check (title is null or char_length(title) <= 200),
  content_json jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default ''
    constraint entries_content_text_length check (char_length(content_text) <= 100000),
  visibility public.entry_visibility not null default 'private',
  status public.entry_status not null default 'draft',
  -- Bumped on every update; the editor uses it to refuse stale saves.
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint entries_state_valid check (
    (status = 'published' and visibility in ('public', 'selected') and published_at is not null)
    or (status in ('draft', 'unpublished') and visibility = 'private')
  )
);

create index entries_author_updated_idx on public.entries (author_id, updated_at desc);
create index entries_public_feed_idx on public.entries (published_at desc, id desc)
  where status = 'published' and visibility = 'public';

create function public.entries_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  -- published_at is owned by the database: set once on first publication and
  -- kept through unpublish/republish so old pieces do not jump the feed.
  new.published_at := case
    when new.status = 'published' then coalesce(old.published_at, now())
    else old.published_at
  end;
  return new;
end;
$$;

create function public.entries_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger entries_before_update before update on public.entries
  for each row execute function public.entries_before_update();
create trigger entries_before_insert before insert on public.entries
  for each row execute function public.entries_before_insert();

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint tags_name_length check (char_length(name) between 1 and 40),
  slug text not null unique constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.entry_tags (
  entry_id uuid not null references public.entries (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (entry_id, tag_id)
);

create index entry_tags_tag_idx on public.entry_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Social graph and interactions
-- ---------------------------------------------------------------------------

create table public.likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create index likes_entry_idx on public.likes (entry_id);

create table public.bookmarks (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create index bookmarks_user_created_idx on public.bookmarks (user_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null
    constraint comments_content_length check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_entry_created_idx on public.comments (entry_id, created_at);

create function public.comments_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.entry_id := old.entry_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger comments_before_update before update on public.comments
  for each row execute function public.comments_before_update();

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

-- Reports point at exactly one target through a real foreign key each, so a
-- report can never reference a row that does not exist.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_id uuid references public.entries (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text constraint reports_details_length check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_one_target check (num_nonnulls(entry_id, comment_id, profile_id) = 1)
);

-- ---------------------------------------------------------------------------
-- Helper functions used by policies
-- ---------------------------------------------------------------------------

-- Blocks are private to the blocker, so a plain subquery from the blocked
-- user's session cannot see them. This definer function answers only a
-- yes/no question and exposes no rows.
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create function public.is_public_entry(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.entries
    where id = target and status = 'published' and visibility = 'public'
  );
$$;

-- Search over the caller's own writing. Runs as the caller, so RLS applies,
-- and the author filter keeps other people's public posts out of results.
create function public.search_my_entries(q text, max_rows integer default 50)
returns setof public.entries
language sql
stable
set search_path = ''
as $$
  with pattern as (
    select '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  )
  select e.*
  from public.entries e, pattern
  where e.author_id = auth.uid()
    and (
      coalesce(e.title, '') ilike pattern.p
      or e.content_text ilike pattern.p
      or exists (
        select 1 from public.entry_tags et join public.tags t on t.id = et.tag_id
        where et.entry_id = e.id and (t.name ilike pattern.p or t.slug ilike pattern.p)
      )
    )
  order by e.updated_at desc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.search_my_entries(text, integer) from public, anon;
grant execute on function public.search_my_entries(text, integer) to authenticated;

-- Lets a signed-in user delete their own account. Cascades remove the
-- profile and everything that hangs off it.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.tags enable row level security;
alter table public.entry_tags enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "profiles are public" on public.profiles
  for select using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- entries
create policy "authors read own entries" on public.entries
  for select to authenticated using (author_id = auth.uid());
create policy "anyone reads published public entries" on public.entries
  for select using (status = 'published' and visibility = 'public');
create policy "authors create private drafts" on public.entries
  for insert to authenticated
  with check (author_id = auth.uid() and status = 'draft' and visibility = 'private');
create policy "authors update own entries" on public.entries
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete own entries" on public.entries
  for delete to authenticated using (author_id = auth.uid());

-- tags: readable by all, created by signed-in users through tagging.
create policy "tags are public" on public.tags
  for select using (true);
create policy "signed-in users create tags" on public.tags
  for insert to authenticated with check (true);

-- entry_tags: visible when the entry is visible (the subquery runs under the
-- caller's entries policies), writable only by the entry's author.
create policy "entry tags follow entry visibility" on public.entry_tags
  for select using (exists (select 1 from public.entries e where e.id = entry_id));
create policy "authors tag own entries" on public.entry_tags
  for insert to authenticated
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.author_id = auth.uid()));
create policy "authors untag own entries" on public.entry_tags
  for delete to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and e.author_id = auth.uid()));

-- likes
create policy "likes follow entry visibility" on public.likes
  for select using (exists (select 1 from public.entries e where e.id = entry_id));
create policy "users like public entries as themselves" on public.likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_public_entry(entry_id)
    and not public.is_blocked_between(auth.uid(), (select e.author_id from public.entries e where e.id = entry_id))
  );
create policy "users remove own likes" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- bookmarks: private to their owner.
create policy "users read own bookmarks" on public.bookmarks
  for select to authenticated using (user_id = auth.uid());
create policy "users bookmark public entries" on public.bookmarks
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_public_entry(entry_id));
create policy "users remove own bookmarks" on public.bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- comments
create policy "comments follow entry visibility" on public.comments
  for select using (exists (select 1 from public.entries e where e.id = entry_id));
create policy "users comment on public entries as themselves" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_public_entry(entry_id)
    and not public.is_blocked_between(auth.uid(), (select e.author_id from public.entries e where e.id = entry_id))
  );
create policy "users edit own comments on public entries" on public.comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.is_public_entry(entry_id));
create policy "comment authors and entry authors delete comments" on public.comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.entries e where e.id = entry_id and e.author_id = auth.uid())
  );

-- follows: the graph is public so counts work for visitors.
create policy "follows are public" on public.follows
  for select using (true);
create policy "users follow as themselves" on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid() and not public.is_blocked_between(follower_id, following_id));
create policy "users unfollow as themselves" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- blocks: private to the blocker.
create policy "users read own blocks" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "users block as themselves" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "users unblock as themselves" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- reports: write-only for users. No select policy, so nobody but the
-- service role can read them. Targets must be visible to the reporter.
create policy "users file reports on visible targets" on public.reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and (entry_id is null or public.is_public_entry(entry_id))
    and (comment_id is null or exists (select 1 from public.comments c where c.id = comment_id))
    and (profile_id is null or profile_id <> auth.uid())
  );

-- When blocking someone, drop the follow edges in both directions.
create function public.blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

revoke execute on function public.blocks_after_insert() from public, anon, authenticated;

create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.blocks_after_insert();
