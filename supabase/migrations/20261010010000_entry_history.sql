-- Writing time and save history.
--
-- entries.writing_seconds: active writing time reported by the editor. The
-- update trigger only lets it grow, and by no more than the wall-clock time
-- since the previous save (plus slack), so a client can't inflate it.
--
-- entry_checkpoints: private snapshots taken on "Save draft", publish and
-- unpublish. Deltas (words added, time spent) are computed between
-- consecutive rows when reading.

alter table public.entries
  add column writing_seconds integer not null default 0
  constraint entries_writing_seconds_nonnegative check (writing_seconds >= 0);

create or replace function public.entries_before_update()
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
  new.writing_seconds := least(
    greatest(new.writing_seconds, old.writing_seconds),
    old.writing_seconds + greatest(0, extract(epoch from (now() - old.updated_at)))::integer + 60
  );
  return new;
end;
$$;

create or replace function public.entries_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  -- A brand-new entry can't have more than a few minutes of history.
  new.writing_seconds := least(greatest(new.writing_seconds, 0), 600);
  return new;
end;
$$;

create table public.entry_checkpoints (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null constraint entry_checkpoints_kind check (kind in ('save', 'publish', 'unpublish')),
  title text,
  word_count integer not null constraint entry_checkpoints_words check (word_count >= 0),
  char_count integer not null constraint entry_checkpoints_chars check (char_count >= 0),
  writing_seconds integer not null constraint entry_checkpoints_seconds check (writing_seconds >= 0),
  created_at timestamptz not null default now()
);

create index entry_checkpoints_entry_created_idx on public.entry_checkpoints (entry_id, created_at desc);

alter table public.entry_checkpoints enable row level security;

-- History is private to the author, like drafts.
create policy "authors read own checkpoints" on public.entry_checkpoints
  for select to authenticated using (author_id = auth.uid());
create policy "authors add checkpoints to own entries" on public.entry_checkpoints
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = entry_id and e.author_id = auth.uid())
  );
