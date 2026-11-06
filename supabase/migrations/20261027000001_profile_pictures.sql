-- Profile picture support on profiles and public avatars storage bucket.

alter table public.profiles
  add column if not exists avatar_url text
    check (avatar_url is null or char_length(avatar_url) <= 250000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Allow multi-select values (comma-separated) for registration survey fields
alter table public.profiles
  drop constraint if exists profiles_study_pace_check,
  drop constraint if exists profiles_availability_check,
  drop constraint if exists profiles_referral_source_check;

alter table public.profiles
  add constraint profiles_study_pace_check
    check (study_pace is null or char_length(study_pace) <= 120),
  add constraint profiles_availability_check
    check (availability is null or char_length(availability) <= 120),
  add constraint profiles_referral_source_check
    check (referral_source is null or char_length(referral_source) <= 120);

