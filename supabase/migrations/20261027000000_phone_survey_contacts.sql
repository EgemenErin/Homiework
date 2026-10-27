-- Phone sign-in OTP inbox, account creation survey fields, and optional contact-based group discovery.

alter table public.profiles
  add column if not exists phone text check (phone is null or char_length(phone) <= 24),
  add column if not exists email text check (email is null or char_length(email) <= 254),
  add column if not exists topics text[] not null default '{}'::text[],
  add column if not exists study_pace text
    check (study_pace is null or study_pace in ('short', 'deep', 'multimedia', 'mix')),
  add column if not exists availability text
    check (availability is null or availability in ('weeknights', 'weekend_morning', 'weekend_afternoon', 'flexible')),
  add column if not exists background text not null default '' check (char_length(background) <= 120),
  add column if not exists referral_source text
    check (referral_source is null or referral_source in ('friend', 'group_chat', 'campus', 'social', 'other')),
  add column if not exists survey_completed_at timestamptz;

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_phone_digits_idx on public.profiles (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10));

-- Sync email and phone from auth.users for existing profiles
update public.profiles p
set email = coalesce(p.email, lower(nullif(u.email, ''))),
    phone = coalesce(p.phone, nullif(u.phone, ''), nullif(u.raw_user_meta_data ->> 'phone', ''))
from auth.users u
where p.id = u.id;

-- Give demo profiles phone numbers so contact discovery works out of the box
update public.profiles p
set phone = c.phone
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, '+15550101001'),
  ('22222222-2222-2222-2222-222222222222'::uuid, '+15550101002'),
  ('33333333-3333-3333-3333-333333333333'::uuid, '+15550101003'),
  ('44444444-4444-4444-4444-444444444444'::uuid, '+15550101004'),
  ('55555555-5555-5555-5555-555555555555'::uuid, '+15550101005')
) as c(id, phone)
where p.id = c.id and p.phone is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email, phone)
  values (
    new.id,
    coalesce(left(new.raw_user_meta_data ->> 'display_name', 40), ''),
    lower(nullif(new.email, '')),
    coalesce(nullif(new.phone, ''), nullif(new.raw_user_meta_data ->> 'phone', ''))
  )
  on conflict (id) do update
  set email = coalesce(excluded.email, public.profiles.email),
      phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact_name text not null default '' check (char_length(contact_name) <= 80),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 32),
  created_at timestamptz not null default now()
);
create index if not exists user_contacts_user_idx on public.user_contacts (user_id);

alter table public.user_contacts enable row level security;

drop policy if exists "own contacts" on public.user_contacts;
create policy "own contacts" on public.user_contacts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Server-only OTP outbox for SMS / email fallback & MCP inspection
create table if not exists public.auth_otp_codes (
  target text primary key,
  channel text not null check (channel in ('sms', 'email')),
  code text not null,
  message text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.auth_otp_codes enable row level security;

drop policy if exists "auth_otp_codes_service_only" on public.auth_otp_codes;
create policy "auth_otp_codes_service_only"
  on public.auth_otp_codes
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.find_groups_by_contacts(
  p_emails text[] default '{}'::text[],
  p_phones text[] default '{}'::text[]
)
returns table (
  group_id uuid,
  group_name text,
  invite_code text,
  meet_weekday smallint,
  meet_time time,
  timezone text,
  member_count bigint,
  matched_friends text[],
  already_member boolean
)
language sql stable security definer set search_path = '' as $$
  with norm_emails as (
    select distinct lower(trim(e)) as email
    from unnest(coalesce(p_emails, '{}'::text[])) as e
    where trim(e) <> ''
  ),
  norm_phones as (
    select distinct right(regexp_replace(p, '\D', '', 'g'), 10) as phone_tail
    from unnest(coalesce(p_phones, '{}'::text[])) as p
    where length(regexp_replace(p, '\D', '', 'g')) >= 7
  ),
  matched_profiles as (
    select p.id,
           coalesce(nullif(trim(p.display_name), ''), split_part(p.email, '@', 1), 'A friend') as friend_name
    from public.profiles p
    where p.id is distinct from (select auth.uid())
      and (
        (p.email is not null and lower(trim(p.email)) in (select email from norm_emails))
        or (
          p.phone is not null
          and length(regexp_replace(p.phone, '\D', '', 'g')) >= 7
          and right(regexp_replace(p.phone, '\D', '', 'g'), 10) in (select phone_tail from norm_phones)
        )
      )
  ),
  group_hits as (
    select gm.group_id,
           array_agg(distinct mp.friend_name order by mp.friend_name) as matched_friends
    from public.group_members gm
    join matched_profiles mp on mp.id = gm.user_id
    group by gm.group_id
  )
  select g.id as group_id,
         g.name as group_name,
         g.invite_code,
         g.meet_weekday,
         g.meet_time,
         g.timezone,
         (select count(*) from public.group_members m where m.group_id = g.id) as member_count,
         gh.matched_friends,
         exists (
           select 1 from public.group_members m
           where m.group_id = g.id and m.user_id = (select auth.uid())
         ) as already_member
  from group_hits gh
  join public.groups g on g.id = gh.group_id
  order by array_length(gh.matched_friends, 1) desc, g.created_at desc;
$$;

revoke execute on function public.find_groups_by_contacts(text[], text[]) from public, anon;
grant execute on function public.find_groups_by_contacts(text[], text[]) to authenticated;
