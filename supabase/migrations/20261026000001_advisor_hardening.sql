-- Covering indexes for foreign keys flagged by Supabase Performance Advisor
create index if not exists attendance_user_idx on public.attendance (user_id);
create index if not exists checkins_user_idx on public.checkins (user_id);
create index if not exists groups_created_by_idx on public.groups (created_by);
create index if not exists notifications_sent_user_idx on public.notifications_sent (user_id);
create index if not exists rounds_host_idx on public.rounds (host_id);
create index if not exists rsvps_user_idx on public.rsvps (user_id);
create index if not exists suggestion_votes_user_idx on public.suggestion_votes (user_id);
create index if not exists suggestions_author_idx on public.suggestions (author_id);
create index if not exists suggestions_used_in_round_idx on public.suggestions (used_in_round);

-- Explicit deny policy for client roles on notifications_sent (service_role bypasses RLS)
drop policy if exists "notifications_sent_service_only" on public.notifications_sent;
create policy "notifications_sent_service_only"
  on public.notifications_sent
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Allow unauthenticated invite preview on /join/[code]
grant execute on function public.invite_preview(text) to anon, authenticated;

