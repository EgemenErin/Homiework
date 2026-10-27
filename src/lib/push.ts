import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { isLocalDemoMode } from "@/lib/supabase/local-store";
import { formatMeetup } from "@/lib/dates";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;
function configure() {
  if (isLocalDemoMode()) return false;
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv || !process.env.SUPABASE_SECRET_KEY) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@homiework.app", pub, priv);
  configured = true;
  return true;
}

/** Sends to every device of each user. Removes subscriptions the push service says are gone. */
export async function sendToUsers(userIds: string[], payload: PushPayload) {
  if (!configure() || userIds.length === 0) return 0;
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (!subs?.length) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 })
        .catch((err: { statusCode?: number }) => {
          if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.id);
          throw err;
        }),
    ),
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  return results.filter((r) => r.status === "fulfilled").length;
}

async function loadRound(roundId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("rounds")
    .select("id, group_id, host_id, topic_title, meetup_at, status, groups!inner(name, timezone)")
    .eq("id", roundId)
    .maybeSingle();
  return data;
}

async function nameOf(userId: string | null) {
  if (!userId) return "Someone";
  const { data } = await createAdminClient().from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return data?.display_name?.trim() || "Someone";
}

/** "Your turn to set this week's topic." to whoever hosts the round now. */
export async function notifyRoundHost(roundId: string) {
  if (!configure()) return;
  const round = await loadRound(roundId);
  if (!round?.host_id || round.status !== "awaiting_topic") return;
  await sendToUsers([round.host_id], {
    title: round.groups.name,
    body: "Your turn to set this week's topic.",
    url: `/g/${round.group_id}/assign`,
    tag: `turn-${round.id}`,
  });
}

/** Tells everyone except the host that the homework is out. */
export async function notifyTopicPublished(roundId: string) {
  if (!configure()) return;
  const round = await loadRound(roundId);
  if (!round?.topic_title) return;
  const { data: members } = await createAdminClient()
    .from("group_members")
    .select("user_id")
    .eq("group_id", round.group_id);
  const others = (members ?? []).map((m) => m.user_id).filter((id) => id !== round.host_id);
  const host = await nameOf(round.host_id);
  await sendToUsers(others, {
    title: round.groups.name,
    body: `${host} set this week's homework: ${round.topic_title}${round.meetup_at ? ` (meetup ${formatMeetup(round.meetup_at, round.groups.timezone)})` : ""}`,
    url: `/g/${round.group_id}`,
    tag: `topic-${round.id}`,
  });
}
