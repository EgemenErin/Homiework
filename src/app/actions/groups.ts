"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { dbError, zodFieldErrors, type ActionState } from "@/lib/actions";
import {
  getUser,
  isUuid,
  requireUser,
  type CampusGroupMatch,
} from "@/lib/data";
import { postDiscordWebhook } from "@/lib/discord";
import { notifyRoundHost } from "@/lib/push";
import { getSyllabusPack } from "@/lib/syllabus-packs";
import {
  createLocalDemoClient,
  mergeGroupOverlay,
  updateGroupOverlay,
} from "@/lib/supabase/local-store";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the group a name.")
    .max(60, "Keep it under 60 characters."),
  meet_weekday: z.coerce.number().int().min(0).max(6),
  meet_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  timezone: z.string().min(1).max(64),
  university_name: z.string().trim().max(80).optional(),
  is_campus_public: z.boolean().optional(),
});

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("/onboarding");
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    meet_weekday: formData.get("meet_weekday"),
    meet_time: formData.get("meet_time"),
    timezone: formData.get("timezone") || "UTC",
    university_name: String(formData.get("university_name") ?? ""),
    is_campus_public: formData.get("is_campus_public") === "true",
  });
  if (!parsed.success)
    return { fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
    p_weekday: parsed.data.meet_weekday,
    p_time: parsed.data.meet_time,
    p_timezone: parsed.data.timezone,
  });
  if (error || !data) return { error: dbError(error) };

  if (parsed.data.university_name) {
    updateGroupOverlay(
      data,
      {
        university_name: parsed.data.university_name,
        is_campus_public: Boolean(parsed.data.is_campus_public),
      },
      parsed.data.name,
    );
    await supabase
      .from("groups")
      .update({
        university_name: parsed.data.university_name,
        is_campus_public: Boolean(parsed.data.is_campus_public),
      })
      .eq("id", data);
  }

  redirect(`/g/${data}`);
}

/** Accepts a full invite link or just the code. */
function extractCode(input: string) {
  const trimmed = input.trim();
  const match = /\/join\/([a-z0-9]+)/i.exec(trimmed);
  return (match ? match[1] : trimmed).toLowerCase();
}

export async function joinGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser("/onboarding");
  const code = extractCode(String(formData.get("code") ?? ""));
  if (!/^[a-z0-9]{4,32}$/.test(code)) {
    return { fieldErrors: { code: "Paste the invite link someone sent you." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error || !data) return { error: dbError(error) };
  redirect(`/g/${data}`);
}

export async function regenerateInvite(groupId: string): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_invite", {
    p_group: groupId,
  });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function reorderRotation(
  groupId: string,
  order: string[],
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId) || !order.every(isUuid))
    return { error: "Unknown group." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_rotation", {
    p_group: groupId,
    p_order: order,
  });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function leaveGroup(groupId: string): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const supabase = await createClient();

  const before = await supabase
    .from("rounds")
    .select("id, host_id")
    .eq("group_id", groupId)
    .neq("status", "closed")
    .maybeSingle();
  const user = await getUser();
  const { error } = await supabase.rpc("leave_group", { p_group: groupId });
  if (error) return { error: dbError(error) };

  // If the leaver was the host, the round moved on; tell the new host.
  if (before.data && before.data.host_id === user?.id) {
    const roundId = before.data.id;
    after(() => notifyRoundHost(roundId));
  }
  redirect("/home");
}

/**
 * Unlocks Homiework Club Pass for the entire group (any member can sponsor the group).
 */
export async function upgradeGroupToClubPass(
  groupId: string,
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  updateGroupOverlay(groupId, { plan_tier: "club_pass" });
  const admin = createAdminClient();
  await admin
    .from("groups")
    .update({ plan_tier: "club_pass" })
    .eq("id", groupId);
  refresh();
  return { ok: true };
}

/**
 * Unlocks a Syllabus Pack and sets it as the active Mastery Track for the group.
 */
export async function activateSyllabusPack(
  groupId: string,
  packId: string | null,
  weekNumber = 1,
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };

  const admin = createAdminClient();
  const { data: rawGroup } = await admin
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  const group = rawGroup
    ? mergeGroupOverlay(rawGroup)
    : mergeGroupOverlay({ id: groupId, name: "Study Group" });

  if (!packId) {
    updateGroupOverlay(groupId, { active_pack_id: null, active_pack_week: 1 }, group.name);
    await admin
      .from("groups")
      .update({ active_pack_id: null, active_pack_week: 1 })
      .eq("id", groupId);
    refresh();
    return { ok: true };
  }

  const pack = getSyllabusPack(packId);
  if (!pack) return { error: "Unknown syllabus pack." };

  const unlocked = Array.from(
    new Set([...(group.unlocked_packs ?? []), pack.id]),
  );
  const clampedWeek = Math.min(Math.max(1, weekNumber), pack.weeksCount);

  updateGroupOverlay(
    groupId,
    {
      unlocked_packs: unlocked,
      active_pack_id: pack.id,
      active_pack_week: clampedWeek,
    },
    group.name,
  );
  await admin
    .from("groups")
    .update({
      unlocked_packs: unlocked,
      active_pack_id: pack.id,
      active_pack_week: clampedWeek,
    })
    .eq("id", groupId);
  refresh();
  return { ok: true };
}

/**
 * Updates Custom Club Stamps & Paper Handout Themes (Club Pass feature).
 */
export async function saveClubStyle(
  groupId: string,
  paperTheme: "classic" | "blueprint" | "manila" | "exam_blue" = "classic",
  stampStyle:
    | "classic_due"
    | "library_dater"
    | "wax_seal"
    | "classified"
    | "dept_approved" = "classic_due",
  stampMotto = "",
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const patch = {
    paper_theme: paperTheme ?? ("classic" as const),
    stamp_style: stampStyle ?? ("classic_due" as const),
    stamp_motto: String(stampMotto ?? "").trim().slice(0, 32),
  };
  updateGroupOverlay(groupId, patch);
  const admin = createAdminClient();
  await admin.from("groups").update(patch).eq("id", groupId);
  refresh();
  return { ok: true };
}

/**
 * Saves the Discord Webhook URL for a group.
 */
export async function saveDiscordWebhook(
  groupId: string,
  webhookUrl = "",
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const trimmed = String(webhookUrl ?? "").trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return { error: "Paste a valid https:// Discord webhook URL." };
  }
  updateGroupOverlay(groupId, { discord_webhook_url: trimmed || null });
  const admin = createAdminClient();
  await admin
    .from("groups")
    .update({ discord_webhook_url: trimmed || null })
    .eq("id", groupId);
  refresh();
  return { ok: true };
}

export async function sendDiscordTest(
  groupId: string,
  webhookUrl = "",
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const trimmed = String(webhookUrl ?? "").trim();
  if (!trimmed) return { error: "Enter a Discord webhook URL first." };

  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle();

  const res = await postDiscordWebhook(trimmed, {
    embeds: [
      {
        title: `${group?.name ?? "Your study group"} is connected to Discord!`,
        description:
          "New weekly homework topics, meetup times, and host turns will automatically post here.",
        color: 0xc8102e,
      },
    ],
  });
  if (!res.ok) return { error: res.error ?? "Could not reach Discord." };
  return { ok: true };
}

/**
 * Optional Peer-to-Peer Meetup Pot / Homework Jar settings and ledger actions.
 */
export async function savePotSettings(
  groupId: string,
  potEnabled: boolean,
  potStakeText = "$3 to the Thursday Coffee/Beer Pot",
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const patch = {
    pot_enabled: Boolean(potEnabled),
    pot_stake_text:
      String(potStakeText ?? "").trim().slice(0, 80) ||
      "$3 to the Thursday Coffee/Beer Pot",
  };
  updateGroupOverlay(groupId, patch);
  const admin = createAdminClient();
  await admin.from("groups").update(patch).eq("id", groupId);
  refresh();
  return { ok: true };
}

export async function addPotEntry(
  groupId: string,
  targetUserId: string,
  reason = "Skipped homework before meetup",
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId) || !isUuid(targetUserId))
    return { error: "Invalid member." };
  const payload = {
    group_id: groupId,
    user_id: targetUserId,
    reason:
      String(reason ?? "").trim().slice(0, 120) ||
      "Skipped homework before meetup",
    settled: false,
  };
  const supabase = await createClient();
  const { error } = await supabase.from("pot_entries").insert(payload);
  if (error) {
    const local = await createLocalDemoClient(true);
    await local.from("pot_entries").insert(payload);
  }
  refresh();
  return { ok: true };
}

export async function togglePotSettled(
  entryId: string,
  settled: boolean,
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(entryId)) return { error: "Unknown entry." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("pot_entries")
    .update({ settled: Boolean(settled) })
    .eq("id", entryId);
  if (error) {
    const local = await createLocalDemoClient(true);
    await local
      .from("pot_entries")
      .update({ settled: Boolean(settled) })
      .eq("id", entryId);
  }
  refresh();
  return { ok: true };
}

/**
 * University / Campus Club discovery settings (Free for all groups).
 */
export async function saveCampusSettings(
  groupId: string,
  universityName = "",
  isCampusPublic = false,
): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const cleanUni = String(universityName ?? "").trim().slice(0, 80);
  const patch = {
    university_name: cleanUni || null,
    is_campus_public: Boolean(cleanUni && isCampusPublic),
  };
  updateGroupOverlay(groupId, patch);
  const admin = createAdminClient();
  await admin.from("groups").update(patch).eq("id", groupId);
  refresh();
  return { ok: true };
}

export async function searchCampusGroups(
  query = "",
): Promise<CampusGroupMatch[]> {
  await requireUser();
  const q = String(query ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_campus_groups", {
    p_query: q,
  });
  if (data) return data;
  const local = await createLocalDemoClient(true);
  const { data: localData } = await local.rpc("find_campus_groups", {
    p_query: q,
  });
  return (localData ?? []) as CampusGroupMatch[];
}
