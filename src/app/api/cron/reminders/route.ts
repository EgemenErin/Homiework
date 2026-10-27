import { type NextRequest, NextResponse } from "next/server";
import { formatTime } from "@/lib/dates";
import { sendToUsers } from "@/lib/push";
import { nextHost } from "@/lib/rotation";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: "SUPABASE_SECRET_KEY not set" }, { status: 500 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  // 1. Auto-close rounds that are >24h past their meetup time.
  const { data: autoClosed } = await admin.rpc("auto_close_stale_rounds");

  // 2. Load all currently open rounds with their group details.
  const { data: rounds } = await admin
    .from("rounds")
    .select(
      "id, group_id, host_id, status, topic_title, meetup_at, created_at, groups!inner(name, timezone)",
    )
    .neq("status", "closed");

  let sentCount = 0;

  async function sendOnce(
    roundId: string,
    kind: string,
    userIds: string[],
    payload: { title: string; body: string; url: string; tag: string },
  ) {
    if (userIds.length === 0) return;
    const { data: already } = await admin
      .from("notifications_sent")
      .select("user_id")
      .eq("round_id", roundId)
      .eq("kind", kind)
      .in("user_id", userIds);

    const sentSet = new Set((already ?? []).map((r) => r.user_id));
    const pending = userIds.filter((id) => !sentSet.has(id));
    if (pending.length === 0) return;

    await admin.from("notifications_sent").insert(
      pending.map((user_id) => ({
        round_id: roundId,
        kind,
        user_id,
      })),
    );
    sentCount += await sendToUsers(pending, payload);
  }

  for (const r of rounds ?? []) {
    // Host still hasn't set a topic 48h after round opened
    if (
      r.status === "awaiting_topic" &&
      r.host_id &&
      now - new Date(r.created_at).getTime() > 48 * 3_600_000
    ) {
      await sendOnce(r.id, "host_nudge", [r.host_id], {
        title: r.groups.name,
        body: "The group's waiting on your topic.",
        url: `/g/${r.group_id}/assign`,
        tag: `nudge-${r.id}`,
      });
    }

    if (r.status === "assigned" && r.meetup_at) {
      const meetupMs = new Date(r.meetup_at).getTime();
      const hoursUntil = (meetupMs - now) / 3_600_000;

      // 24h before meetup: remind members who haven't checked in yet
      if (hoursUntil > 0 && hoursUntil <= 24) {
        const [{ data: members }, { data: checkins }] = await Promise.all([
          admin
            .from("group_members")
            .select("user_id")
            .eq("group_id", r.group_id),
          admin.from("checkins").select("user_id").eq("round_id", r.id),
        ]);
        const done = new Set((checkins ?? []).map((c) => c.user_id));
        const unchecked = (members ?? [])
          .map((m) => m.user_id)
          .filter((id) => !done.has(id));

        await sendOnce(r.id, "meetup_24h", unchecked, {
          title: r.groups.name,
          body: `Meetup tomorrow at ${formatTime(r.meetup_at, r.groups.timezone)}. Done the homework?`,
          url: `/g/${r.group_id}`,
          tag: `24h-${r.id}`,
        });
      }

      // 2h after meetup: remind host to close the week
      if (hoursUntil <= -2 && hoursUntil > -24 && r.host_id) {
        const { data: members } = await admin
          .from("group_members")
          .select("user_id, rotation_position, profile:profiles!inner(display_name)")
          .eq("group_id", r.group_id)
          .order("rotation_position");

        const next = nextHost(members ?? [], r.host_id);
        const nextName =
          next?.profile?.display_name?.trim() || "the next homie";

        await sendOnce(r.id, "close_nudge", [r.host_id], {
          title: r.groups.name,
          body: `Close the week so the turn passes to ${nextName}.`,
          url: `/g/${r.group_id}/close`,
          tag: `close-${r.id}`,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    autoClosed: autoClosed ?? 0,
    notificationsSent: sentCount,
  });
}
