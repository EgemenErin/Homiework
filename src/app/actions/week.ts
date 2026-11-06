"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { dbError, zodFieldErrors, type ActionState } from "@/lib/actions";
import {
  isUuid,
  requireUser,
  type RoundNote,
  type RoundQuestion,
} from "@/lib/data";
import { fromDateTimeLocal } from "@/lib/dates";
import {
  notifyDiscordRoundHost,
  notifyDiscordTopicPublished,
} from "@/lib/discord";
import { notifyRoundHost, notifyTopicPublished } from "@/lib/push";
import {
  createLocalDemoClient,
  mergeGroupOverlay,
} from "@/lib/supabase/local-store";
import { createClient } from "@/lib/supabase/server";

const resourceSchema = z.object({
  url: z
    .url({
      protocol: /^https?$/,
      error: "Links need to start with https://",
    })
    .max(2000),
  label: z.string().trim().min(1, "Give each link a short label.").max(120),
  kind: z.enum(["read", "watch", "listen", "other"]),
  minutes: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(999)])
    .optional(),
});

const uuidField = z.string().refine(isUuid, "Invalid ID.");

const topicSchema = z.object({
  round_id: uuidField,
  group_id: uuidField,
  topic_title: z
    .string()
    .trim()
    .min(3, "Write the topic as a question or a title.")
    .max(120, "Keep the topic under 120 characters."),
  why: z
    .string()
    .trim()
    .max(600, "Keep this under 600 characters.")
    .optional(),
  meetup_at: z.string().min(1, "Pick when you're meeting."),
  meetup_place: z
    .string()
    .trim()
    .max(80, "Keep the place under 80 characters.")
    .optional(),
  timezone: z.string().min(1),
  suggestion_id: z.union([z.literal(""), uuidField]).optional(),
});

export async function publishTopic(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: zodFieldErrors(parsed.error.issues) };
  const t = parsed.data;

  const meetupAt = fromDateTimeLocal(t.meetup_at, t.timezone);
  if (!meetupAt) return { fieldErrors: { meetup_at: "Pick a date and time." } };
  if (meetupAt.getTime() < Date.now() - 60_000) {
    return {
      fieldErrors: {
        meetup_at: "That time has already passed. Pick a time in the future.",
      },
    };
  }

  const urls = formData.getAll("resource_url").map(String);
  const labels = formData.getAll("resource_label").map(String);
  const kinds = formData.getAll("resource_kind").map(String);
  const minutes = formData.getAll("resource_minutes").map(String);
  const resources = [];
  for (let i = 0; i < urls.length; i++) {
    if (!urls[i].trim() && !labels[i]?.trim()) continue; // empty row
    const url = /^https?:\/\//i.test(urls[i].trim())
      ? urls[i].trim()
      : `https://${urls[i].trim()}`;
    const r = resourceSchema.safeParse({
      url,
      label: labels[i] || hostLabel(url),
      kind: kinds[i] || "read",
      minutes: minutes[i] ?? "",
    });
    if (!r.success)
      return {
        fieldErrors: {
          resources: `Link ${i + 1}: ${r.error.issues[0].message}`,
        },
      };
    resources.push({
      ...r.data,
      minutes: r.data.minutes === "" ? null : (r.data.minutes ?? null),
    });
  }
  if (resources.length > 10)
    return {
      fieldErrors: {
        resources: "Ten links is the limit. Keep the homework doable.",
      },
    };

  // Parse optional Pop Quiz questions ("Exam Your Friends")
  const examPrompts = formData.getAll("exam_prompt").map(String);
  const examOpt0 = formData.getAll("exam_opt_0").map(String);
  const examOpt1 = formData.getAll("exam_opt_1").map(String);
  const examOpt2 = formData.getAll("exam_opt_2").map(String);
  const examOpt3 = formData.getAll("exam_opt_3").map(String);
  const examCorrect = formData.getAll("exam_correct").map(String);
  const questionsToSave: {
    round_id: string;
    prompt: string;
    options: string[];
    correct_index: number;
    sort: number;
  }[] = [];

  for (let i = 0; i < examPrompts.length && i < 5; i++) {
    const prompt = examPrompts[i]?.trim();
    if (!prompt) continue;
    const opts = [
      examOpt0[i]?.trim() || "Option A",
      examOpt1[i]?.trim() || "Option B",
      examOpt2[i]?.trim() || "",
      examOpt3[i]?.trim() || "",
    ].filter(Boolean);
    if (opts.length < 2) continue;
    const correctIdx = Math.min(
      Math.max(0, Number.parseInt(examCorrect[i] ?? "0", 10) || 0),
      opts.length - 1,
    );
    questionsToSave.push({
      round_id: t.round_id,
      prompt: prompt.slice(0, 240),
      options: opts,
      correct_index: correctIdx,
      sort: questionsToSave.length,
    });
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("rounds")
    .select("published_at")
    .eq("id", t.round_id)
    .single();
  const { error } = await supabase.rpc("publish_topic", {
    p_round: t.round_id,
    p_title: t.topic_title,
    p_why: t.why ?? "",
    p_meetup_at: meetupAt.toISOString(),
    p_place: t.meetup_place ?? "",
    p_resources: resources,
    p_suggestion: t.suggestion_id || undefined,
  });
  if (error) return { error: dbError(error) };

  // Save Pop Quiz questions if provided
  const local = await createLocalDemoClient(true);
  await Promise.all([
    supabase.from("round_questions").delete().eq("round_id", t.round_id),
    local.from("round_questions").delete().eq("round_id", t.round_id),
  ]);
  if (questionsToSave.length > 0) {
    const { error: qErr } = await supabase
      .from("round_questions")
      .insert(questionsToSave);
    if (qErr) {
      await local.from("round_questions").insert(questionsToSave);
    }
  }

  if (!before?.published_at) {
    after(async () => {
      await Promise.allSettled([
        notifyTopicPublished(t.round_id),
        notifyDiscordTopicPublished(t.round_id),
      ]);
    });
  }
  redirect(`/g/${t.group_id}`);
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export async function passTurn(
  groupId: string,
  roundId: string,
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId) || !isUuid(roundId)) return { error: "Unknown week." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pass_turn", { p_round: roundId });
  if (error) return { error: dbError(error) };
  after(async () => {
    await Promise.allSettled([
      notifyRoundHost(roundId),
      notifyDiscordRoundHost(roundId),
    ]);
  });
  redirect(`/g/${groupId}`);
}

export async function closeRound(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("group_id"));
  const roundId = String(formData.get("round_id"));
  const postNote = String(formData.get("post_meetup_note") ?? "").trim();
  const attended = formData.getAll("attended").map(String).filter(isUuid);
  if (!isUuid(groupId) || !isUuid(roundId)) return { error: "Unknown week." };

  const supabase = await createClient();
  const local = await createLocalDemoClient(true);
  if (postNote) {
    const { data: existing } = await supabase
      .from("round_notes")
      .select("pre_study_note")
      .eq("round_id", roundId)
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: rawLocalExisting } = existing
      ? { data: existing }
      : await local
          .from("round_notes")
          .select("pre_study_note")
          .eq("round_id", roundId)
          .eq("user_id", user.id)
          .maybeSingle();
    const localExisting = rawLocalExisting as Pick<
      RoundNote,
      "pre_study_note"
    > | null;
    const notePayload = {
      round_id: roundId,
      user_id: user.id,
      pre_study_note: localExisting?.pre_study_note ?? "",
      post_meetup_note: postNote.slice(0, 1000),
      updated_at: new Date().toISOString(),
    };
    const { error: noteErr } = await supabase
      .from("round_notes")
      .upsert(notePayload);
    if (noteErr) {
      await local.from("round_notes").upsert(notePayload);
    }
  }

  // If the group's Homework Jar is enabled, log an IOU for attendees who didn't check in
  const { data: rawGroup } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  const group = rawGroup
    ? mergeGroupOverlay(rawGroup)
    : mergeGroupOverlay({ id: groupId, name: "Study Group" });
  if (group.pot_enabled && attended.length > 0) {
    const { data: checkins } = await supabase
      .from("checkins")
      .select("user_id")
      .eq("round_id", roundId);
    const doneSet = new Set((checkins ?? []).map((c) => c.user_id));
    for (const uid of attended) {
      if (!doneSet.has(uid)) {
        const iouPayload = {
          group_id: groupId,
          round_id: roundId,
          user_id: uid,
          reason: "Attended meetup without checking off the homework",
          settled: false,
        };
        const { error: potErr } = await supabase
          .from("pot_entries")
          .insert(iouPayload);
        if (potErr) {
          await local.from("pot_entries").insert(iouPayload);
        }
      }
    }
  }

  const { data: nextRound, error } = await supabase.rpc("close_round", {
    p_round: roundId,
    p_attended: attended,
  });
  if (error) return { error: dbError(error) };
  if (nextRound) {
    after(async () => {
      await Promise.allSettled([
        notifyRoundHost(nextRound),
        notifyDiscordRoundHost(nextRound),
      ]);
    });
  }
  redirect(`/g/${groupId}`);
}

const rsvpSchema = z.enum(["going", "maybe", "out"]);

export async function setRsvp(
  roundId: string,
  status: string,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rsvpSchema.safeParse(status);
  if (!isUuid(roundId) || !parsed.success)
    return { error: "Pick going, maybe, or can't make it." };
  const supabase = await createClient();
  const { error } = await supabase.from("rsvps").upsert({
    round_id: roundId,
    user_id: user.id,
    status: parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function setCheckin(
  roundId: string,
  done: boolean,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isUuid(roundId)) return { error: "Unknown week." };
  const supabase = await createClient();
  const { error } = done
    ? await supabase
        .from("checkins")
        .upsert(
          { round_id: roundId, user_id: user.id },
          { ignoreDuplicates: true },
        )
    : await supabase
        .from("checkins")
        .delete()
        .eq("round_id", roundId)
        .eq("user_id", user.id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function saveRoundNote(
  roundId: string,
  preStudyNote = "",
  postMeetupNote = "",
): Promise<ActionState> {
  const user = await requireUser();
  if (!isUuid(roundId)) return { error: "Unknown week." };
  const pre = String(preStudyNote ?? "").trim().slice(0, 1000);
  const post = String(postMeetupNote ?? "").trim().slice(0, 1000);
  const payload = {
    round_id: roundId,
    user_id: user.id,
    pre_study_note: pre,
    post_meetup_note: post,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("round_notes").upsert(payload);
  if (error) {
    const local = await createLocalDemoClient(true);
    await local.from("round_notes").upsert(payload);
  }
  refresh();
  return { ok: true };
}

export async function submitRoundExam(
  roundId: string,
  answers: number[],
): Promise<ActionState & { score?: number; total?: number }> {
  const user = await requireUser();
  if (!isUuid(roundId)) return { error: "Unknown week." };

  const supabase = await createClient();
  const local = await createLocalDemoClient(true);
  const { data: questions } = await supabase
    .from("round_questions")
    .select("*")
    .eq("round_id", roundId)
    .order("sort");

  const { data: fallbackQuestions } = questions
    ? { data: questions }
    : await local
        .from("round_questions")
        .select("*")
        .eq("round_id", roundId)
        .order("sort");

  const list = (fallbackQuestions ?? []) as RoundQuestion[];
  if (list.length === 0) return { error: "No quiz questions for this week." };

  let score = 0;
  const cleanAnswers = list.map((q, idx) => {
    const picked = Number(answers[idx] ?? -1);
    if (picked === q.correct_index) score++;
    return picked;
  });

  const payload = {
    round_id: roundId,
    user_id: user.id,
    answers: cleanAnswers,
    score,
    total: list.length,
    submitted_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("round_exam_submissions")
    .upsert(payload);
  if (error) {
    await local.from("round_exam_submissions").upsert(payload);
  }
  refresh();
  return { ok: true, score, total: list.length };
}
