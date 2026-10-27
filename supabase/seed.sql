-- Local demo data: one group of five homies, two finished weeks, one live week.
-- Sign in locally as any of these emails; the magic link lands in Mailpit (http://127.0.0.1:54324).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('homiework-demo', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name),
       now() - interval '30 days', now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'ege@homiework.test', 'Ege'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'mert@homiework.test', 'Mert'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'kerem@homiework.test', 'Kerem'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'aylin@homiework.test', 'Aylin'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'selin@homiework.test', 'Selin')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users where email like '%@homiework.test';

update public.profiles set avatar_color = c.color, phone = c.phone
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'ink', '+15550101001'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'red', '+15550101002'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'green', '+15550101003'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'plum', '+15550101004'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'ochre', '+15550101005')
) as c(id, color, phone)
where profiles.id = c.id;

insert into public.groups (id, name, invite_code, meet_weekday, meet_time, timezone, created_by, created_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'The Homies', 'homies2026', 4, '19:00', 'Europe/Berlin',
        '11111111-1111-1111-1111-111111111111', now() - interval '30 days');

insert into public.group_members (group_id, user_id, role, rotation_position, joined_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner', 0, now() - interval '30 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'member', 1, now() - interval '29 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'member', 2, now() - interval '29 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'member', 3, now() - interval '28 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'member', 4, now() - interval '28 days');

-- Week 1 (Ege) and week 2 (Mert) are done.
insert into public.rounds (id, group_id, number, host_id, status, topic_title, why, meetup_at, meetup_place, published_at, closed_at, created_at)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1,
   '11111111-1111-1111-1111-111111111111', 'closed',
   'Why do we dream?',
   'Half of us swear dreams mean something and the other half think it''s noise. Let''s find out who''s right.',
   now() - interval '18 days', 'Ege''s place', now() - interval '23 days', now() - interval '17 days', now() - interval '27 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 2,
   '22222222-2222-2222-2222-222222222222', 'closed',
   'How did the Roman Republic fall?',
   'Everyone keeps comparing things to the fall of Rome. None of us could say what actually happened.',
   now() - interval '11 days', 'Café Kranzler', now() - interval '16 days', now() - interval '10 days', now() - interval '17 days');

-- Week 3 (Kerem) is live, meetup on the next Thursday at 19:00 Berlin time.
insert into public.rounds (id, group_id, number, host_id, status, topic_title, why, meetup_at, meetup_place, published_at, created_at)
values (
  'bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 3,
  '33333333-3333-3333-3333-333333333333', 'assigned',
  'How does the Federal Reserve set interest rates?',
  'We keep arguing about inflation and none of us actually knows how the rate gets decided.',
  (
    with base as (
      select (date_trunc('week', now() at time zone 'Europe/Berlin') + interval '3 days 19 hours') as t
    )
    select case when (t at time zone 'Europe/Berlin') > now() + interval '1 day'
                then t at time zone 'Europe/Berlin'
                else (t + interval '7 days') at time zone 'Europe/Berlin' end
    from base
  ),
  'Kerem''s place', now() - interval '2 days', now() - interval '10 days'
);

insert into public.resources (round_id, url, label, kind, minutes, sort) values
  ('bbbbbbbb-0000-0000-0000-000000000003', 'https://www.federalreserve.gov/monetarypolicy/fomc.htm', 'What the FOMC is and how it votes', 'read', 10, 0),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'https://www.npr.org/sections/money/', 'Planet Money on rate hikes', 'listen', 25, 1),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'https://www.youtube.com/results?search_query=how+the+fed+sets+interest+rates', 'How the Fed steers rates, explained', 'watch', 14, 2);

insert into public.checkins (round_id, user_id, done_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now() - interval '19 days'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '19 days'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '19 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', now() - interval '12 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', now() - interval '12 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', now() - interval '12 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', now() - interval '12 days'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', now() - interval '1 day'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', now() - interval '20 hours');

insert into public.attendance (round_id, user_id, attended) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', true),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', true),
  ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', true),
  ('bbbbbbbb-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', true),
  ('bbbbbbbb-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', true);

insert into public.rsvps (round_id, user_id, status) values
  ('bbbbbbbb-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'going'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'going'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'maybe');

insert into public.suggestions (id, group_id, author_id, title, pitch, created_at) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'How do vaccines train the immune system?', 'I nodded along through 2021 without really getting it.', now() - interval '9 days'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555',
   'What makes a song get stuck in your head?', null, now() - interval '6 days'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Why is the Ottoman Empire called "the sick man of Europe"?', 'My grandad says it every dinner. Time to check.', now() - interval '3 days');

insert into public.suggestion_votes (suggestion_id, user_id) values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('cccccccc-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444'),
  ('cccccccc-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555'),
  ('cccccccc-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555');
