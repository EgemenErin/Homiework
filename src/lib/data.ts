import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import {
  createLocalDemoClient,
  mergeGroupOverlay,
} from "@/lib/supabase/local-store";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/database.types";

export type Profile = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "avatar_color"
> & {
  avatar_url?: string | null;
};
export type FullProfile = Tables<"profiles">;
export type ContactGroupMatch = Database["public"]["Functions"]["find_groups_by_contacts"]["Returns"][number];
export type CampusGroupMatch = Database["public"]["Functions"]["find_campus_groups"]["Returns"][number];
export type Member = Pick<Tables<"group_members">, "user_id" | "role" | "rotation_position" | "joined_at"> & {
  profile: Profile;
};
export type Round = Tables<"rounds">;
export type Resource = Tables<"resources">;
export type Group = Tables<"groups">;
export type RoundNote = Tables<"round_notes">;
export type RoundQuestion = Tables<"round_questions">;
export type RoundExamSubmission = Tables<"round_exam_submissions">;
export type PotEntry = Tables<"pot_entries">;

/** The signed-in user, verified with Supabase Auth. Deduplicated per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Redirects to sign-in when there's no session. */
export async function requireUser(next = "/home") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export const getMyProfile = cache(async (): Promise<FullProfile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
});

export const getMyContactMatches = cache(async (): Promise<{
  contactsCount: number;
  matches: ContactGroupMatch[];
}> => {
  const user = await getUser();
  if (!user) return { contactsCount: 0, matches: [] };
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("user_contacts")
    .select("contact_email, contact_phone")
    .eq("user_id", user.id);

  const list = contacts ?? [];
  if (list.length === 0) return { contactsCount: 0, matches: [] };

  const emails = list
    .map((c) => c.contact_email)
    .filter((e): e is string => Boolean(e));
  const phones = list
    .map((c) => c.contact_phone)
    .filter((p): p is string => Boolean(p));

  const { data: matches } = await supabase.rpc("find_groups_by_contacts", {
    p_emails: emails,
    p_phones: phones,
  });

  return {
    contactsCount: list.length,
    matches: matches ?? [],
  };
});

export const getMyGroups = cache(async () => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("joined_at, role, group:groups!inner(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });
  return (data ?? []).map((row) => ({ ...row.group, role: row.role }));
});

const MEMBER_SELECT =
  "user_id, role, rotation_position, joined_at, profile:profiles!inner(id, display_name, avatar_color, avatar_url)";

/** Group + members. 404s for non-members (RLS hides the row). */
export const getGroup = cache(async (groupId: string) => {
  if (!isUuid(groupId)) notFound();
  const supabase = await createClient();
  const [group, members] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select(MEMBER_SELECT).eq("group_id", groupId).order("rotation_position"),
  ]);
  if (!group.data) notFound();
  return {
    group: mergeGroupOverlay(group.data),
    members: (members.data ?? []) as Member[],
  };
});

/** Everything the "This week" screen needs, loaded in parallel. */
export async function getWeek(groupId: string) {
  const supabase = await createClient();
  const local = await createLocalDemoClient(true);
  const [user, { group, members }, open, lastClosed] = await Promise.all([
    getUser(),
    getGroup(groupId),
    supabase.from("rounds").select("*").eq("group_id", groupId).neq("status", "closed").maybeSingle(),
    supabase
      .from("rounds")
      .select("id, number, topic_title, closed_at, meetup_at")
      .eq("group_id", groupId)
      .eq("status", "closed")
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const round = open.data;
  const [resources, rsvps, checkins, notes, questions, examSubmissions, potEntries] = round
    ? await Promise.all([
        supabase.from("resources").select("*").eq("round_id", round.id).order("sort"),
        supabase.from("rsvps").select("user_id, status").eq("round_id", round.id),
        supabase.from("checkins").select("user_id, done_at").eq("round_id", round.id),
        supabase.from("round_notes").select("*").eq("round_id", round.id),
        supabase.from("round_questions").select("*").eq("round_id", round.id).order("sort"),
        supabase.from("round_exam_submissions").select("*").eq("round_id", round.id),
        supabase.from("pot_entries").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      ])
    : [
        { data: [] as Resource[] },
        { data: [] as { user_id: string; status: string }[] },
        { data: [] as { user_id: string; done_at: string }[] },
        { data: null as RoundNote[] | null },
        { data: null as RoundQuestion[] | null },
        { data: null as RoundExamSubmission[] | null },
        await supabase.from("pot_entries").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      ];

  const [fallbackNotes, fallbackQuestions, fallbackExams, fallbackPot] = round
    ? await Promise.all([
        notes.data ? { data: notes.data } : local.from("round_notes").select("*").eq("round_id", round.id),
        questions.data ? { data: questions.data } : local.from("round_questions").select("*").eq("round_id", round.id).order("sort"),
        examSubmissions.data ? { data: examSubmissions.data } : local.from("round_exam_submissions").select("*").eq("round_id", round.id),
        potEntries.data ? { data: potEntries.data } : local.from("pot_entries").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      ])
    : [
        { data: [] as RoundNote[] },
        { data: [] as RoundQuestion[] },
        { data: [] as RoundExamSubmission[] },
        potEntries.data ? { data: potEntries.data } : await local.from("pot_entries").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      ];

  return {
    userId: user!.id,
    group,
    members,
    round,
    isFresh: Boolean(round?.published_at && Date.now() - new Date(round.published_at).getTime() < 86_400_000),
    lastClosed: lastClosed.data,
    resources: (resources.data ?? []) as Resource[],
    rsvps: rsvps.data ?? [],
    checkins: checkins.data ?? [],
    notes: (fallbackNotes.data ?? []) as RoundNote[],
    questions: (fallbackQuestions.data ?? []) as RoundQuestion[],
    examSubmissions: (fallbackExams.data ?? []) as RoundExamSubmission[],
    potEntries: (fallbackPot.data ?? []) as PotEntry[],
  };
}

export async function getBacklog(groupId: string) {
  const supabase = await createClient();
  const [user, { group, members }, suggestions, votes, open] = await Promise.all([
    getUser(),
    getGroup(groupId),
    supabase
      .from("suggestions")
      .select("id, title, pitch, author_id, created_at, used_in_round")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
    supabase.from("suggestion_votes").select("suggestion_id, user_id, suggestions!inner(group_id)").eq("suggestions.group_id", groupId),
    supabase.from("rounds").select("id, host_id, status").eq("group_id", groupId).neq("status", "closed").maybeSingle(),
  ]);

  const voteCount = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes.data ?? []) {
    voteCount.set(v.suggestion_id, (voteCount.get(v.suggestion_id) ?? 0) + 1);
    if (v.user_id === user!.id) mine.add(v.suggestion_id);
  }
  const byId = new Map(members.map((m) => [m.user_id, m.profile]));
  const rows = (suggestions.data ?? []).map((s) => ({
    ...s,
    votes: voteCount.get(s.id) ?? 0,
    votedByMe: mine.has(s.id),
    author: s.author_id ? byId.get(s.author_id) ?? null : null,
  }));

  return {
    userId: user!.id,
    group,
    open: rows.filter((s) => !s.used_in_round).toSorted((a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at)),
    used: rows.filter((s) => s.used_in_round),
    round: open.data,
  };
}

export async function getCrew(groupId: string) {
  const supabase = await createClient();
  const local = await createLocalDemoClient(true);
  const [user, { group, members }, open, past, potEntries] = await Promise.all([
    getUser(),
    getGroup(groupId),
    supabase.from("rounds").select("id, host_id, status").eq("group_id", groupId).neq("status", "closed").maybeSingle(),
    supabase
      .from("rounds")
      .select("id, number, topic_title, why, host_id, meetup_at, closed_at")
      .eq("group_id", groupId)
      .eq("status", "closed")
      .order("number", { ascending: false })
      .limit(50),
    supabase
      .from("pot_entries")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
  ]);

  const fallbackPot = potEntries.data
    ? potEntries
    : await local
        .from("pot_entries")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

  const allRoundIds = [
    ...(open.data ? [open.data.id] : []),
    ...(past.data ?? []).map((r) => r.id),
  ];

  const [notesRes, examsRes] =
    allRoundIds.length > 0
      ? await Promise.all([
          supabase.from("round_notes").select("*").in("round_id", allRoundIds),
          supabase.from("round_exam_submissions").select("*").in("round_id", allRoundIds),
        ])
      : [{ data: [] as RoundNote[] }, { data: [] as RoundExamSubmission[] }];

  const [fallbackNotes, fallbackExams] =
    allRoundIds.length > 0
      ? await Promise.all([
          notesRes.data ? notesRes : local.from("round_notes").select("*").in("round_id", allRoundIds),
          examsRes.data ? examsRes : local.from("round_exam_submissions").select("*").in("round_id", allRoundIds),
        ])
      : [{ data: [] as RoundNote[] }, { data: [] as RoundExamSubmission[] }];

  return {
    userId: user!.id,
    group,
    members,
    round: open.data,
    past: past.data ?? [],
    potEntries: (fallbackPot.data ?? []) as PotEntry[],
    notes: (fallbackNotes.data ?? []) as RoundNote[],
    examSubmissions: (fallbackExams.data ?? []) as RoundExamSubmission[],
  };
}

export async function getSemesterZineData(groupId: string) {
  const supabase = await createClient();
  const local = await createLocalDemoClient(true);
  const [user, { group, members }, roundsRes, stats] = await Promise.all([
    getUser(),
    getGroup(groupId),
    supabase
      .from("rounds")
      .select("*")
      .eq("group_id", groupId)
      .order("number", { ascending: true }),
    getStats(groupId),
  ]);

  const rounds = (roundsRes.data ?? []).filter((r) => r.topic_title);
  const roundIds = rounds.map((r) => r.id);

  const [resourcesRes, notesRes, examsRes, checkinsRes] =
    roundIds.length > 0
      ? await Promise.all([
          supabase.from("resources").select("*").in("round_id", roundIds).order("sort"),
          supabase.from("round_notes").select("*").in("round_id", roundIds),
          supabase.from("round_exam_submissions").select("*").in("round_id", roundIds),
          supabase.from("checkins").select("*").in("round_id", roundIds),
        ])
      : [
          { data: [] as Resource[] },
          { data: [] as RoundNote[] },
          { data: [] as RoundExamSubmission[] },
          { data: [] as { round_id: string; user_id: string; done_at: string }[] },
        ];

  const [fallbackNotes, fallbackExams] =
    roundIds.length > 0
      ? await Promise.all([
          notesRes.data ? notesRes : local.from("round_notes").select("*").in("round_id", roundIds),
          examsRes.data ? examsRes : local.from("round_exam_submissions").select("*").in("round_id", roundIds),
        ])
      : [{ data: [] as RoundNote[] }, { data: [] as RoundExamSubmission[] }];

  return {
    userId: user!.id,
    group,
    members,
    rounds,
    resources: (resourcesRes.data ?? []) as Resource[],
    notes: (fallbackNotes.data ?? []) as RoundNote[],
    examSubmissions: (fallbackExams.data ?? []) as RoundExamSubmission[],
    checkins: checkinsRes.data ?? [],
    stats,
  };
}

export const getCampusGroups = cache(async (query = ""): Promise<CampusGroupMatch[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_campus_groups", { p_query: query });
  if (data) return data;
  const local = await createLocalDemoClient(true);
  const { data: localData } = await local.rpc("find_campus_groups", { p_query: query });
  return (localData ?? []) as CampusGroupMatch[];
});

export async function getStats(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("member_stats", { p_group: groupId });
  return new Map((data ?? []).map((s) => [s.user_id, s]));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) {
  return UUID_RE.test(value);
}
