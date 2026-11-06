-- Monetization, Club Pass, Study Notes, Pop Quizzes, Syllabus Packs, Pot Ledger, Campus Clubs & Integrations

alter table public.groups
  add column if not exists plan_tier text not null default 'free'
    check (plan_tier in ('free', 'club_pass')),
  add column if not exists paper_theme text not null default 'classic'
    check (paper_theme in ('classic', 'blueprint', 'manila', 'exam_blue')),
  add column if not exists stamp_style text not null default 'classic_due'
    check (stamp_style in ('classic_due', 'library_dater', 'wax_seal', 'classified', 'dept_approved')),
  add column if not exists stamp_motto text not null default ''
    check (char_length(stamp_motto) <= 32),
  add column if not exists active_pack_id text,
  add column if not exists active_pack_week integer not null default 1,
  add column if not exists unlocked_packs text[] not null default '{}',
  add column if not exists discord_webhook_url text
    check (discord_webhook_url is null or (discord_webhook_url ~* '^https?://' and char_length(discord_webhook_url) <= 500)),
  add column if not exists pot_enabled boolean not null default false,
  add column if not exists pot_stake_text text not null default '$3 to the Thursday Coffee/Beer Pot'
    check (char_length(pot_stake_text) <= 80),
  add column if not exists university_name text
    check (university_name is null or char_length(university_name) <= 80),
  add column if not exists is_campus_public boolean not null default false;

-- Pre-meetup study margin notes & post-meetup reflections (Free for all groups; compiled into Semester Zine PDF)
create table if not exists public.round_notes (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pre_study_note text not null default '' check (char_length(pre_study_note) <= 1000),
  post_meetup_note text not null default '' check (char_length(post_meetup_note) <= 1000),
  updated_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

-- Pop Quiz ("Exam Your Friends") questions per round
create table if not exists public.round_questions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 240),
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0 check (correct_index between 0 and 3),
  sort integer not null default 0
);
create index if not exists round_questions_round_idx on public.round_questions (round_id);

-- Pop Quiz member submissions & scores
create table if not exists public.round_exam_submissions (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  submitted_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

-- Optional Peer-to-Peer Meetup Pot / Homework Jar entries (honor-system IOU between friends)
create table if not exists public.pot_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  round_id uuid references public.rounds (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'Skipped homework before meetup' check (char_length(reason) <= 120),
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pot_entries_group_idx on public.pot_entries (group_id);

-- RLS Policies
alter table public.round_notes enable row level security;
alter table public.round_questions enable row level security;
alter table public.round_exam_submissions enable row level security;
alter table public.pot_entries enable row level security;

create policy "members read round notes" on public.round_notes for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "members write own round notes" on public.round_notes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(public.round_group(round_id)));
create policy "members update own round notes" on public.round_notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_member(public.round_group(round_id)));

create policy "members read round questions" on public.round_questions for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "members manage round questions" on public.round_questions for all to authenticated
  using (public.is_member(public.round_group(round_id)))
  with check (public.is_member(public.round_group(round_id)));

create policy "members read exam submissions" on public.round_exam_submissions for select to authenticated
  using (public.is_member(public.round_group(round_id)));
create policy "members submit own exam" on public.round_exam_submissions for all to authenticated
  using (user_id = (select auth.uid()) and public.is_member(public.round_group(round_id)))
  with check (user_id = (select auth.uid()) and public.is_member(public.round_group(round_id)));

create policy "members read pot entries" on public.pot_entries for select to authenticated
  using (public.is_member(group_id));
create policy "members manage pot entries" on public.pot_entries for all to authenticated
  using (public.is_member(group_id))
  with check (public.is_member(group_id));

-- Public University Campus Clubs discovery RPC (Free for everyone)
create or replace function public.find_campus_groups(p_query text default '')
returns table (
  group_id uuid,
  group_name text,
  university_name text,
  invite_code text,
  meet_weekday smallint,
  meet_time time,
  timezone text,
  member_count bigint,
  already_member boolean
)
language sql stable security definer set search_path = '' as $$
  select
    g.id as group_id,
    g.name as group_name,
    coalesce(g.university_name, '') as university_name,
    g.invite_code,
    g.meet_weekday,
    g.meet_time,
    g.timezone,
    (select count(*) from public.group_members m where m.group_id = g.id) as member_count,
    exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = (select auth.uid())
    ) as already_member
  from public.groups g
  where g.is_campus_public = true
    and g.university_name is not null
    and trim(g.university_name) <> ''
    and (
      trim(coalesce(p_query, '')) = ''
      or g.university_name ilike '%' || trim(p_query) || '%'
      or g.name ilike '%' || trim(p_query) || '%'
    )
  order by g.created_at desc
  limit 25;
$$;

grant execute on function public.find_campus_groups(text) to authenticated;
