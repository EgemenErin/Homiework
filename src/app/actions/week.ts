"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUuid, requireUser } from "@/lib/data";
import { dbError, zodFieldErrors, type ActionState } from "@/lib/actions";
import { fromDateTimeLocal } from "@/lib/dates";
import { notifyRoundHost, notifyTopicPublished } from "@/lib/push";

const resourceSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: "Links need to start with https://" }).max(2000),
  label: z.string().trim().min(1, "Give each link a short label.").max(120),
  kind: z.enum(["read", "watch", "listen", "other"]),
  minutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(999)]).optional(),
});

const uuidField = z.string().refine(isUuid, "Invalid ID.");

const topicSchema = z.object({
  round_id: uuidField,
  group_id: uuidField,
  topic_title: z.string().trim().min(3, "Write the topic as a question or a title.").max(120, "Keep the topic under 120 characters."),
  why: z.string().trim().max(600, "Keep this under 600 characters.").optional(),
  meetup_at: z.string().min(1, "Pick when you're meeting."),
  meetup_place: z.string().trim().max(80, "Keep the place under 80 characters.").optional(),
  timezone: z.string().min(1),
  suggestion_id: z.union([z.literal(""), uuidField]).optional(),
});

export async function publishTopic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error.issues) };
  const t = parsed.data;

  const meetupAt = fromDateTimeLocal(t.meetup_at, t.timezone);
  if (!meetupAt) return { fieldErrors: { meetup_at: "Pick a date and time." } };
  if (meetupAt.getTime() < Date.now() - 60_000) {
    return { fieldErrors: { meetup_at: "That time has already passed. Pick a time in the future." } };
  }

  const urls = formData.getAll("resource_url").map(String);
  const labels = formData.getAll("resource_label").map(String);
  const kinds = formData.getAll("resource_kind").map(String);
  const minutes = formData.getAll("resource_minutes").map(String);
  const resources = [];
  for (let i = 0; i < urls.length; i++) {
    if (!urls[i].trim() && !labels[i]?.trim()) continue; // empty row
    const url = /^https?:\/\//i.test(urls[i].trim()) ? urls[i].trim() : `https://${urls[i].trim()}`;
    const r = resourceSchema.safeParse({ url, label: labels[i] || hostLabel(url), kind: kinds[i] || "read", minutes: minutes[i] ?? "" });
    if (!r.success) return { fieldErrors: { resources: `Link ${i + 1}: ${r.error.issues[0].message}` } };
    resources.push({ ...r.data, minutes: r.data.minutes === "" ? null : r.data.minutes ?? null });
  }
  if (resources.length > 10) return { fieldErrors: { resources: "Ten links is the limit. Keep the homework doable." } };

  const supabase = await createClient();
  const { data: before } = await supabase.from("rounds").select("published_at").eq("id", t.round_id).single();
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

  if (!before?.published_at) {
    after(() => notifyTopicPublished(t.round_id));
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

export async function passTurn(groupId: string, roundId: string): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId) || !isUuid(roundId)) return { error: "Unknown week." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pass_turn", { p_round: roundId });
  if (error) return { error: dbError(error) };
  after(() => notifyRoundHost(roundId));
  redirect(`/g/${groupId}`);
}

export async function closeRound(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const groupId = String(formData.get("group_id"));
  const roundId = String(formData.get("round_id"));
  const attended = formData.getAll("attended").map(String).filter(isUuid);
  if (!isUuid(groupId) || !isUuid(roundId)) return { error: "Unknown week." };

  const supabase = await createClient();
  const { data: nextRound, error } = await supabase.rpc("close_round", { p_round: roundId, p_attended: attended });
  if (error) return { error: dbError(error) };
  if (nextRound) after(() => notifyRoundHost(nextRound));
  redirect(`/g/${groupId}`);
}

const rsvpSchema = z.enum(["going", "maybe", "out"]);

export async function setRsvp(roundId: string, status: string): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rsvpSchema.safeParse(status);
  if (!isUuid(roundId) || !parsed.success) return { error: "Pick going, maybe, or can't make it." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("rsvps")
    .upsert({ round_id: roundId, user_id: user.id, status: parsed.data, updated_at: new Date().toISOString() });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function setCheckin(roundId: string, done: boolean): Promise<ActionState> {
  const user = await requireUser();
  if (!isUuid(roundId)) return { error: "Unknown week." };
  const supabase = await createClient();
  const { error } = done
    ? await supabase.from("checkins").upsert({ round_id: roundId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("checkins").delete().eq("round_id", roundId).eq("user_id", user.id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}
