import "server-only";
import { formatMeetup } from "@/lib/dates";
import { mergeGroupOverlay } from "@/lib/supabase/local-store";
import { createAdminClient } from "@/lib/supabase/server";

type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
};

const INK_COLOR = 0x111111;
const RED_STAMP_COLOR = 0xc8102e;

export async function postDiscordWebhook(
  webhookUrl: string,
  payload: { content?: string; embeds?: DiscordEmbed[] },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const parsed = new URL(webhookUrl);
    if (!parsed.protocol.startsWith("http")) {
      return { ok: false, error: "Invalid webhook URL." };
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Homiework Study Club",
        ...payload,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Discord returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not reach Discord.",
    };
  }
}

export async function notifyDiscordTopicPublished(roundId: string) {
  try {
    const admin = createAdminClient();
    const { data: round } = await admin
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .maybeSingle();
    if (!round || !round.topic_title) return;

    const [{ data: rawGroup }, { data: host }, { data: resources }] =
      await Promise.all([
        admin.from("groups").select("*").eq("id", round.group_id).maybeSingle(),
        round.host_id
          ? admin
              .from("profiles")
              .select("display_name")
              .eq("id", round.host_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        admin
          .from("resources")
          .select("*")
          .eq("round_id", roundId)
          .order("sort"),
      ]);

    const group = rawGroup ? mergeGroupOverlay(rawGroup) : null;
    if (!group?.discord_webhook_url) return;

    const hostName = host?.display_name?.trim() || "This week's host";
    const meetupStr = round.meetup_at
      ? formatMeetup(round.meetup_at, group.timezone)
      : "Time TBD";

    const linksList =
      (resources ?? [])
        .map(
          (r, i) =>
            `${i + 1}. [${r.label}](${r.url}) (${r.kind}${r.minutes ? `, ${r.minutes}m` : ""})`,
        )
        .join("\n") || "Bring your own reading/watching notes.";

    await postDiscordWebhook(group.discord_webhook_url, {
      embeds: [
        {
          title: `Week ${round.number}: ${round.topic_title}`,
          description: round.why || `Set by **${hostName}** for **${group.name}**.`,
          color: RED_STAMP_COLOR,
          fields: [
            {
              name: "Host",
              value: hostName,
              inline: true,
            },
            {
              name: "Meetup",
              value: `${meetupStr}${round.meetup_place ? ` · ${round.meetup_place}` : ""}`,
              inline: true,
            },
            {
              name: "Homework Links",
              value: linksList,
            },
          ],
          footer: {
            text: `Homiework · Check in once you finish the homework`,
          },
        },
      ],
    });
  } catch {
    // Non-blocking background notification
  }
}

export async function notifyDiscordRoundHost(roundId: string) {
  try {
    const admin = createAdminClient();
    const { data: round } = await admin
      .from("rounds")
      .select("*")
      .eq("id", roundId)
      .maybeSingle();
    if (!round || !round.host_id) return;

    const [{ data: rawGroup }, { data: host }] = await Promise.all([
      admin.from("groups").select("*").eq("id", round.group_id).maybeSingle(),
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", round.host_id)
        .maybeSingle(),
    ]);

    const group = rawGroup ? mergeGroupOverlay(rawGroup) : null;
    if (!group?.discord_webhook_url) return;
    const hostName = host?.display_name?.trim() || "Next host";

    await postDiscordWebhook(group.discord_webhook_url, {
      embeds: [
        {
          title: `Week ${round.number} is open — ${hostName} has the pen`,
          description: `It's **${hostName}**'s turn to pick the topic and homework links for **${group.name}**.`,
          color: INK_COLOR,
        },
      ],
    });
  } catch {
    // Non-blocking
  }
}
