-- Row Level Security and rotation tests. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Test users (separate from seed users)
insert into auth.users (id, email, aud, role, raw_user_meta_data, instance_id)
values
  ('a0000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated', '{"display_name":"A"}', '00000000-0000-0000-0000-000000000000'),
  ('b0000000-0000-0000-0000-00000000000b', 'b@test.local', 'authenticated', 'authenticated', '{"display_name":"B"}', '00000000-0000-0000-0000-000000000000'),
  ('c0000000-0000-0000-0000-00000000000c', 'c@test.local', 'authenticated', 'authenticated', '{"display_name":"C"}', '00000000-0000-0000-0000-000000000000'),
  ('d0000000-0000-0000-0000-00000000000d', 'd@test.local', 'authenticated', 'authenticated', '{"display_name":"D"}', '00000000-0000-0000-0000-000000000000');

select is((select display_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'), 'A',
  'signing up creates a profile');

create function pg_temp.login(p uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- A creates a group and is host of round 1
select pg_temp.login('a0000000-0000-0000-0000-00000000000a');
create temp table t_ctx on commit drop as select public.create_group('Test crew', 4::smallint, '19:00', 'Europe/Berlin') as gid;
grant all on t_ctx to authenticated;

select is((select count(*)::int from public.rounds where group_id = (select gid from t_ctx) and status = 'awaiting_topic'), 1,
  'creating a group opens round 1');
select is((select host_id from public.rounds where group_id = (select gid from t_ctx)), 'a0000000-0000-0000-0000-00000000000a'::uuid,
  'the creator hosts round 1');

-- B and C join via invite code
select pg_temp.logout();
create temp table t_code on commit drop as select invite_code from public.groups where id = (select gid from t_ctx);
grant all on t_code to authenticated;
select pg_temp.login('b0000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.join_group((select invite_code from t_code)) $$, 'B joins with the invite code');
select pg_temp.login('c0000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.join_group((select invite_code from t_code)) $$, 'C joins with the invite code');

-- D is not a member
select pg_temp.login('d0000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.groups where id = (select gid from t_ctx)), 0, 'non-members cannot see the group');
select is((select count(*)::int from public.rounds where group_id = (select gid from t_ctx)), 0, 'non-members cannot see rounds');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'), 0,
  'non-members cannot see profiles of strangers');
select is((select name from public.invite_preview((select invite_code from t_code))), 'Test crew',
  'anyone signed in can preview an invite');

-- B cannot publish (not host)
select pg_temp.login('b0000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.publish_topic(
    (select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
    'Hijack', null, now() + interval '2 days', null) $$,
  '42501', null, 'only the host can publish the topic');

-- A passes turn: B becomes host, A goes right after B
select pg_temp.login('a0000000-0000-0000-0000-00000000000a');
select is(public.pass_turn((select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed')),
  'b0000000-0000-0000-0000-00000000000b'::uuid, 'passing hands the round to the next person');
select is(
  (select array_agg(user_id order by rotation_position) from public.group_members where group_id = (select gid from t_ctx)),
  array['b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-00000000000a','c0000000-0000-0000-0000-00000000000c']::uuid[],
  'the person who passed goes next');

-- B publishes with resources
select pg_temp.login('b0000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.publish_topic(
    (select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
    'Why is the sky blue?', 'Nobody remembered', now() + interval '2 days', 'Park',
    '[{"url":"https://example.com/a","label":"Article","kind":"read","minutes":"8"}]'::jsonb) $$,
  'the host publishes a topic');
select is((select count(*)::int from public.resources r join public.rounds o on o.id = r.round_id
           where o.group_id = (select gid from t_ctx)), 1, 'resources are saved with the topic');

-- C checks in and RSVPs; C can't RSVP for B
select pg_temp.login('c0000000-0000-0000-0000-00000000000c');
select lives_ok($$ insert into public.checkins (round_id, user_id)
  values ((select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
          'c0000000-0000-0000-0000-00000000000c') $$, 'members check in for themselves');
select throws_ok($$ insert into public.rsvps (round_id, user_id, status)
  values ((select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
          'b0000000-0000-0000-0000-00000000000b', 'out') $$,
  '42501', null, 'members cannot RSVP for someone else');

-- B closes with C attended; next host is A (after B in rotation)
select pg_temp.login('b0000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.close_round(
    (select id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
    array['c0000000-0000-0000-0000-00000000000c','b0000000-0000-0000-0000-00000000000b']::uuid[]) $$,
  'the host closes the week');
select is((select host_id from public.rounds where group_id = (select gid from t_ctx) and status <> 'closed'),
  'a0000000-0000-0000-0000-00000000000a'::uuid, 'the turn passes to the next person');

select is((select streak from public.member_stats((select gid from t_ctx)) where user_id = 'c0000000-0000-0000-0000-00000000000c'),
  1::bigint, 'checking in builds a streak');
select is((select attended || '/' || held from public.member_stats((select gid from t_ctx))
           where user_id = 'a0000000-0000-0000-0000-00000000000a'),
  '0/1', 'attendance counts meetups held and attended');

select * from finish();
rollback;
