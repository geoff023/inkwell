-- Local development seed. Runs only with `npx supabase db reset` against the
-- local stack; never run it against production. All people and writing here
-- are fictional. Seed authors have no password and cannot log in: create
-- your own account through /signup to try the app.

create function pg_temp.doc(variadic paras text[])
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'type', 'doc',
    'content', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p))
    )), '[]'::jsonb)
  )
  from unnest(paras) as p;
$$;

create function pg_temp.seed_user(uid uuid, uname text, dname text, bio text, joined timestamptz)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    uname || '@seed.inkwell.test', '', joined,
    '{"provider":"email","providers":["email"]}', jsonb_build_object('username', uname, 'display_name', dname),
    joined, joined, '', '', '', ''
  );
  update public.profiles set bio = seed_user.bio, onboarded = true, created_at = joined where id = uid;
end;
$$;

create function pg_temp.seed_post(eid uuid, author uuid, ttl text, at timestamptz, tag_slugs text[], variadic paras text[])
returns void
language plpgsql
as $$
begin
  insert into public.entries (id, author_id, title, content_json, content_text, status, visibility, created_at, updated_at, published_at)
  values (eid, author, ttl, pg_temp.doc(variadic paras), array_to_string(paras, E'\n'), 'published', 'public', at, at, at);
  insert into public.entry_tags (entry_id, tag_id)
  select eid, t.id from public.tags t where t.slug = any(tag_slugs);
end;
$$;

insert into public.tags (name, slug) values
  ('Everyday thoughts', 'everyday-thoughts'),
  ('Memories', 'memories'),
  ('Poetry', 'poetry'),
  ('Books', 'books'),
  ('Relationships', 'relationships'),
  ('Growing up', 'growing-up'),
  ('Creativity', 'creativity'),
  ('Reflections', 'reflections');

select pg_temp.seed_user('11111111-1111-4111-8111-111111111111', 'wren_h', 'Wren Halloway',
  'Night-shift nurse. Writes on the bus home.', now() - interval '200 days');
select pg_temp.seed_user('22222222-2222-4222-8222-222222222222', 'idris', 'Idris Marlowe',
  'Second-hand bookshops and first drafts.', now() - interval '150 days');
select pg_temp.seed_user('33333333-3333-4333-8333-333333333333', 'june_ocampo', 'June Ocampo',
  null, now() - interval '90 days');
select pg_temp.seed_user('44444444-4444-4444-8444-444444444444', 'tomas_v', 'Tomás Vey',
  'Mostly short things. Sometimes poems.', now() - interval '40 days');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', null,
  now() - interval '2 hours', array['everyday-thoughts'],
  'The bus driver waved at another bus driver this morning and both of them smiled like they shared a secret. I think about that more than I should.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Second-hand',
  now() - interval '9 hours', array['books', 'memories'],
  'Someone underlined one sentence in this book, forty years ago, in pencil. Not the famous line everyone quotes. A small one, halfway down a page about a kitchen.',
  'I have been trying to understand why ever since. Maybe it was the first time they read their own life in someone else''s words. Maybe they were just testing the pencil.',
  'I bought the book for the underline. I will probably never read the rest.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'The year I learned to swim',
  now() - interval '1 day', array['growing-up', 'memories'],
  'I was eleven, which felt too old. The other children in the beginners'' class came up to my elbow, and they were braver than me.',
  'The instructor never told me to hurry. She said the water would hold me if I let it, which I thought was a lie adults tell, like the one about carrots and seeing in the dark.',
  'On the last day I floated on my back for a whole minute and looked at the ceiling of the leisure centre, which had a water stain shaped like Portugal. I have never felt so held by anything.',
  'I think about that ceiling when things are hard. The water would hold me if I let it.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444', null,
  now() - interval '1 day 6 hours', array['poetry'],
  'small hours —',
  'the fridge hums a song',
  'it only knows one line of');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'What the night shift teaches',
  now() - interval '3 days', array['reflections'],
  'At four in the morning everyone is honest. Patients tell you about the brother they stopped calling, the job they should have taken, the dog they had as a child.',
  'I used to think it was the medication. Now I think it is the dark, and the quiet, and the fact that nobody has any energy left to pretend.',
  'I don''t write their stories down. But I write down how it felt to be trusted with them.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', null,
  now() - interval '4 days', array['creativity'],
  'Wrote nothing today. Read three pages and watched the rain instead. Counting it anyway.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-333333333333', null,
  now() - interval '6 days', array['relationships'],
  'My grandmother ends every phone call with "go on then", as if I was the one keeping her.');

select pg_temp.seed_post('a0000000-0000-4000-8000-000000000008', '44444444-4444-4444-8444-444444444444', 'Inventory',
  now() - interval '9 days', array['poetry', 'everyday-thoughts'],
  'one key that opens nothing I own',
  'a receipt for bread from a town I can''t place',
  'two buttons, neither from this coat',
  'the feeling, briefly, of being exactly where I meant to be');

-- A private draft, to check it never shows up on public surfaces.
insert into public.entries (author_id, title, content_json, content_text)
values ('11111111-1111-4111-8111-111111111111', 'Not for anyone', pg_temp.doc('This one stays private.'), 'This one stays private.');

insert into public.follows (follower_id, following_id) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'),
  ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111');

insert into public.likes (user_id, entry_id) values
  ('22222222-2222-4222-8222-222222222222', 'a0000000-0000-4000-8000-000000000001'),
  ('33333333-3333-4333-8333-333333333333', 'a0000000-0000-4000-8000-000000000001'),
  ('44444444-4444-4444-8444-444444444444', 'a0000000-0000-4000-8000-000000000003'),
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000002'),
  ('11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000007');

insert into public.comments (entry_id, author_id, content, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'The water stain shaped like Portugal. I can see it.', now() - interval '20 hours', now() - interval '20 hours'),
  ('a0000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333',
   'Now I want to know which sentence.', now() - interval '8 hours', now() - interval '8 hours');
