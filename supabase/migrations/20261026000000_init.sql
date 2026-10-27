-- Homiework schema: groups take turns setting a weekly topic, check in, meet up.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_color text not null default 'ink'
    check (avatar_color in ('ink', 'red', 'green', 'plum', 'ochre', 'teal')),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  meet_weekday smallint not null default 4 check (meet_weekday between 0 and 6),
  meet_time time not null default '19:00',
  timezone text not null default 'UTC',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  rotation_position integer not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  number integer not null,
  host_id uuid references public.profiles (id) on delete set null,
  status text not null default 'awaiting_topic'
    check (status in ('awaiting_topic', 'assigned', 'closed')),
  topic_title text check (char_length(topic_title) <= 120),
  why text check (char_length(why) <= 600),
  meetup_at timestamptz,
  meetup_place text check (char_length(meetup_place) <= 80),
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, number),
  check (status = 'awaiting_topic' or (topic_title is not null and meetup_at is not null))
);
-- At most one open round per group.
create unique index rounds_one_open_per_group on public.rounds (group_id) where status <> 'closed';

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  url text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  label text not null check (char_length(label) between 1 and 120),
  kind text not null default 'read' check (kind in ('read', 'watch', 'listen', 'other')),
  minutes integer check (minutes between 1 and 999),
  sort integer not null default 0
);
create index resources_round_idx on public.resources (round_id);

create table public.rsvps (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

create table public.checkins (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

create table public.attendance (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attended boolean not null,
  primary key (round_id, user_id)
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  pitch text check (char_length(pitch) <= 600),
  used_in_round uuid references public.rounds (id) on delete set null,
  created_at timestamptz not null default now()
);
create index suggestions_group_idx on public.suggestions (group_id);

create table public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (suggestion_id, user_id)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Written only by the server (service role) so reminders are sent once.
create table public.notifications_sent (
  round_id uuid not null references public.rounds (id) on delete cascade,
  kind text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (round_id, kind, user_id)
);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function public.is_member(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = (select auth.uid())
  );
$$;

create function public.is_owner(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create function public.round_group(p_round uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select group_id from public.rounds where id = p_round;
$$;

create function public.round_is_open(p_round uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rounds where id = p_round and status <> 'closed');
$$;

create function public.shares_group(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

-- Next member in rotation order after p_after, wrapping to the start.
create function public.next_host(p_group uuid, p_after uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  with ordered as (
    select user_id, rotation_position from public.group_members where group_id = p_group
  ), cur as (
    select rotation_position from ordered where user_id = p_after
  )
  select coalesce(
    (select user_id from ordered
      where rotation_position > (select rotation_position from cur)
      order by rotation_position limit 1),
    (select user_id from ordered order by rotation_position limit 1)
  );
$$;

-- ---------------------------------------------------------------------------
-- New user -> profile
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 40), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Rotation and round lifecycle
-- ---------------------------------------------------------------------------

-- Internal: open the next round for a group. Not callable by clients.
create function public.start_next_round(p_group uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_last record;
  v_host uuid;
  v_id uuid;
begin
  select number, host_id into v_last
  from public.rounds where group_id = p_group
  order by number desc limit 1;

  if v_last.host_id is null
     or not exists (select 1 from public.group_members
                    where group_id = p_group and user_id = v_last.host_id) then
    select user_id into v_host from public.group_members
    where group_id = p_group order by rotation_position limit 1;
  else
    v_host := public.next_host(p_group, v_last.host_id);
  end if;

  if v_host is null then
    return null; -- empty group
  end if;

  insert into public.rounds (group_id, number, host_id)
  values (p_group, coalesce(v_last.number, 0) + 1, v_host)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.create_group(
  p_name text, p_weekday smallint, p_time time, p_timezone text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '28000'; end if;

  insert into public.groups (name, meet_weekday, meet_time, timezone, created_by)
  values (trim(p_name), p_weekday, p_time, coalesce(nullif(p_timezone, ''), 'UTC'), v_uid)
  returning id into v_id;

  insert into public.group_members (group_id, user_id, role, rotation_position)
  values (v_id, v_uid, 'owner', 0);

  perform public.start_next_round(v_id);
  return v_id;
end;
$$;

create function public.invite_preview(p_code text)
returns table (group_id uuid, name text, member_count bigint, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name,
         (select count(*) from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members m
                 where m.group_id = g.id and m.user_id = (select auth.uid()))
  from public.groups g
  where g.invite_code = lower(trim(p_code));
$$;

create function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '28000'; end if;

  select id into v_group from public.groups where invite_code = lower(trim(p_code));
  if v_group is null then
    raise exception 'That invite link has expired' using errcode = 'P0002';
  end if;

  insert into public.group_members (group_id, user_id, rotation_position)
  values (
    v_group, v_uid,
    (select coalesce(max(rotation_position), -1) + 1
     from public.group_members where group_id = v_group)
  )
  on conflict (group_id, user_id) do nothing;

  -- A group whose only member left has no open round; restart it.
  if not exists (select 1 from public.rounds where group_id = v_group and status <> 'closed') then
    perform public.start_next_round(v_group);
  end if;

  return v_group;
end;
$$;

create function public.publish_topic(
  p_round uuid,
  p_title text,
  p_why text,
  p_meetup_at timestamptz,
  p_place text,
  p_resources jsonb default '[]'::jsonb,
  p_suggestion uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_round public.rounds;
begin
  select * into v_round from public.rounds where id = p_round for update;
  if v_round.id is null or v_round.host_id is distinct from auth.uid() then
    raise exception 'Only this week''s host can set the topic' using errcode = '42501';
  end if;
  if v_round.status = 'closed' then
    raise exception 'This week is already closed' using errcode = '22023';
  end if;

  update public.rounds set
    topic_title = trim(p_title),
    why = nullif(trim(coalesce(p_why, '')), ''),
    meetup_at = p_meetup_at,
    meetup_place = nullif(trim(coalesce(p_place, '')), ''),
    status = 'assigned',
    published_at = coalesce(published_at, now())
  where id = p_round;

  delete from public.resources where round_id = p_round;
  insert into public.resources (round_id, url, label, kind, minutes, sort)
  select p_round,
         trim(r ->> 'url'),
         trim(r ->> 'label'),
         coalesce(r ->> 'kind', 'read'),
         nullif(r ->> 'minutes', '')::integer,
         (ord - 1)::integer
  from jsonb_array_elements(coalesce(p_resources, '[]'::jsonb)) with ordinality as t(r, ord);

  if p_suggestion is not null then
    update public.suggestions set used_in_round = p_round
    where id = p_suggestion and group_id = v_round.group_id and used_in_round is null;
  end if;
end;
$$;

-- Host can't do their week: the next person hosts now, and the passer
-- goes right after them so nobody loses their turn (positions swap).
create function public.pass_turn(p_round uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_round public.rounds;
  v_next uuid;
  v_pos_host integer;
  v_pos_next integer;
begin
  select * into v_round from public.rounds where id = p_round for update;
  if v_round.id is null or v_round.host_id is distinct from auth.uid() then
    raise exception 'Only this week''s host can pass' using errcode = '42501';
  end if;
  if v_round.status <> 'awaiting_topic' then
    raise exception 'You already set the topic for this week' using errcode = '22023';
  end if;

  v_next := public.next_host(v_round.group_id, v_round.host_id);
  if v_next is null or v_next = v_round.host_id then
    raise exception 'There''s nobody to pass to yet. Invite someone first.' using errcode = '22023';
  end if;

  select rotation_position into v_pos_host from public.group_members
  where group_id = v_round.group_id and user_id = v_round.host_id;
  select rotation_position into v_pos_next from public.group_members
  where group_id = v_round.group_id and user_id = v_next;

  update public.group_members set rotation_position =
    case user_id when v_round.host_id then v_pos_next else v_pos_host end
  where group_id = v_round.group_id and user_id in (v_round.host_id, v_next);

  update public.rounds set host_id = v_next where id = p_round;
  return v_next;
end;
$$;

create function public.close_round(p_round uuid, p_attended uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_round public.rounds;
begin
  select * into v_round from public.rounds where id = p_round for update;
  if v_round.id is null
     or (v_round.host_id is distinct from auth.uid() and not public.is_owner(v_round.group_id)) then
    raise exception 'Only this week''s host can close the week' using errcode = '42501';
  end if;
  if v_round.status <> 'assigned' then
    raise exception 'Set a topic before closing the week' using errcode = '22023';
  end if;

  insert into public.attendance (round_id, user_id, attended)
  select p_round, m.user_id, m.user_id = any (coalesce(p_attended, '{}'))
  from public.group_members m where m.group_id = v_round.group_id
  on conflict (round_id, user_id) do update set attended = excluded.attended;

  update public.rounds set status = 'closed', closed_at = now() where id = p_round;
  return public.start_next_round(v_round.group_id);
end;
$$;

-- Server-only: close rounds whose host forgot, 24h after the meetup.
create function public.auto_close_stale_rounds()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_round record;
  v_count integer := 0;
begin
  for v_round in
    select id, group_id from public.rounds
    where status = 'assigned' and meetup_at < now() - interval '24 hours'
    for update skip locked
  loop
    update public.rounds set status = 'closed', closed_at = now() where id = v_round.id;
    perform public.start_next_round(v_round.group_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.reorder_rotation(p_group uuid, p_order uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(p_group) then
    raise exception 'Only the group owner can change the order' using errcode = '42501';
  end if;
  if (select count(*) from public.group_members where group_id = p_group)
     <> coalesce(array_length(p_order, 1), 0)
     or exists (select 1 from public.group_members
                where group_id = p_group and not (user_id = any (p_order))) then
    raise exception 'The new order must include every member once' using errcode = '22023';
  end if;

  update public.group_members m
  set rotation_position = o.pos - 1
  from unnest(p_order) with ordinality as o(user_id, pos)
  where m.group_id = p_group and m.user_id = o.user_id;
end;
$$;

create function public.regenerate_invite(p_group uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text := encode(extensions.gen_random_bytes(6), 'hex');
begin
  if not public.is_owner(p_group) then
    raise exception 'Only the group owner can reset the invite link' using errcode = '42501';
  end if;
  update public.groups set invite_code = v_code where id = p_group;
  return v_code;
end;
$$;

create function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_open public.rounds;
  v_next uuid;
begin
  if not public.is_member(p_group) then
    raise exception 'You''re not in this group' using errcode = '42501';
  end if;

  select * into v_open from public.rounds
  where group_id = p_group and status <> 'closed' for update;

  if v_open.id is not null and v_open.host_id = v_uid then
    v_next := public.next_host(p_group, v_uid);
    if v_next = v_uid then
      delete from public.rounds where id = v_open.id; -- last member leaving
    elsif v_open.status = 'awaiting_topic' then
      update public.rounds set host_id = v_next where id = v_open.id;
    end if;
    -- An assigned round keeps its topic; an owner can still close it.
  end if;

  delete from public.group_members where group_id = p_group and user_id = v_uid;

  if not exists (select 1 from public.group_members where group_id = p_group) then
    delete from public.groups where id = p_group;
  elsif not exists (select 1 from public.group_members where group_id = p_group and role = 'owner') then
    update public.group_members set role = 'owner'
    where group_id = p_group
      and user_id = (select user_id from public.group_members
                     where group_id = p_group order by joined_at limit 1);
  end if;
end;
$$;

-- Streak: closed rounds in a row (most recent first) where you checked in.
-- Attendance: meetups attended out of meetups with attendance taken since joining.
create function public.member_stats(p_group uuid)
returns table (user_id uuid, streak bigint, attended bigint, held bigint, checkins bigint)
language sql stable security definer set search_path = '' as $$
  with m as (
    select gm.user_id, gm.joined_at from public.group_members gm where gm.group_id = p_group
  ),
  eligible as (
    select m.user_id, r.id as round_id, r.number,
           exists (select 1 from public.checkins c
                   where c.round_id = r.id and c.user_id = m.user_id) as did
    from m
    join public.rounds r on r.group_id = p_group and r.status = 'closed'
    where r.closed_at >= m.joined_at
  ),
  last_miss as (
    select e.user_id, max(e.number) as n from eligible e where not e.did group by e.user_id
  )
  select m.user_id,
    (select count(*) from eligible e
      where e.user_id = m.user_id and e.number > coalesce(
        (select lm.n from last_miss lm where lm.user_id = m.user_id), 0)),
    (select count(*) from public.attendance a
      join public.rounds r on r.id = a.round_id
      where r.group_id = p_group and a.user_id = m.user_id and a.attended),
    (select count(*) from public.attendance a
      join public.rounds r on r.id = a.round_id
      where r.group_id = p_group and a.user_id = m.user_id),
    (select count(*) from eligible e where e.user_id = m.user_id and e.did)
  from m
  where public.is_member(p_group);
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_member(uuid), public.is_owner(uuid), public.round_group(uuid),
  public.round_is_open(uuid), public.shares_group(uuid),
  public.create_group(text, smallint, time, text),
  public.invite_preview(text), public.join_group(text),
  public.publish_topic(uuid, text, text, timestamptz, text, jsonb, uuid),
  public.pass_turn(uuid), public.close_round(uuid, uuid[]),
  public.reorder_rotation(uuid, uuid[]), public.regenerate_invite(uuid),
  public.leave_group(uuid), public.member_stats(uuid)
to authenticated;
revoke execute on function public.start_next_round(uuid), public.next_host(uuid, uuid),
  public.auto_close_stale_rounds(), public.handle_new_user() from authenticated;
grant execute on function public.auto_close_stale_rounds() to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rounds enable row level security;
alter table public.resources enable row level security;
alter table public.rsvps enable row level security;
alter table public.checkins enable row level security;
alter table public.attendance enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications_sent enable row level security;

-- profiles
create policy "read own and groupmates" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_group(id));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- groups (create/join through RPCs)
create policy "members read group" on public.groups for select to authenticated
  using (public.is_member(id));
create policy "owners update group" on public.groups for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- group_members (changes through RPCs)
create policy "members read members" on public.group_members for select to authenticated
  using (public.is_member(group_id));

-- rounds, resources, attendance (written through RPCs)
create policy "members read rounds" on public.rounds for select to authenticated
  using (public.is_member(group_id));
create policy "members read resources" on public.resources for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "members read attendance" on public.attendance for select to authenticated
  using (public.is_member(public.round_group(round_id)));

-- rsvps
create policy "members read rsvps" on public.rsvps for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "rsvp for yourself" on public.rsvps for insert to authenticated
  with check (user_id = (select auth.uid())
              and public.is_member(public.round_group(round_id))
              and public.round_is_open(round_id));
create policy "change your rsvp" on public.rsvps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.round_is_open(round_id));
create policy "remove your rsvp" on public.rsvps for delete to authenticated
  using (user_id = (select auth.uid()) and public.round_is_open(round_id));

-- checkins
create policy "members read checkins" on public.checkins for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "check in for yourself" on public.checkins for insert to authenticated
  with check (user_id = (select auth.uid())
              and public.is_member(public.round_group(round_id))
              and public.round_is_open(round_id));
create policy "undo your checkin" on public.checkins for delete to authenticated
  using (user_id = (select auth.uid()) and public.round_is_open(round_id));

-- suggestions
create policy "members read suggestions" on public.suggestions for select to authenticated
  using (public.is_member(group_id));
create policy "members suggest" on public.suggestions for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_member(group_id)
              and used_in_round is null);
create policy "authors edit unused suggestions" on public.suggestions for update to authenticated
  using (author_id = (select auth.uid()) and used_in_round is null)
  with check (author_id = (select auth.uid()) and used_in_round is null);
create policy "authors delete unused suggestions" on public.suggestions for delete to authenticated
  using (author_id = (select auth.uid()) and used_in_round is null);

-- suggestion_votes
create policy "members read votes" on public.suggestion_votes for select to authenticated
  using (public.is_member((select s.group_id from public.suggestions s where s.id = suggestion_id)));
create policy "vote for yourself" on public.suggestion_votes for insert to authenticated
  with check (user_id = (select auth.uid())
              and public.is_member((select s.group_id from public.suggestions s where s.id = suggestion_id)));
create policy "remove your vote" on public.suggestion_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- push_subscriptions
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- notifications_sent: no policies; only the service role touches it.
