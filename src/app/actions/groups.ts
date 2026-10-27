"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, isUuid, requireUser } from "@/lib/data";
import { dbError, zodFieldErrors, type ActionState } from "@/lib/actions";
import { notifyRoundHost } from "@/lib/push";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(60, "Keep it under 60 characters."),
  meet_weekday: z.coerce.number().int().min(0).max(6),
  meet_time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
  timezone: z.string().min(1).max(64),
});

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("/onboarding");
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    meet_weekday: formData.get("meet_weekday"),
    meet_time: formData.get("meet_time"),
    timezone: formData.get("timezone") || "UTC",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
    p_weekday: parsed.data.meet_weekday,
    p_time: parsed.data.meet_time,
    p_timezone: parsed.data.timezone,
  });
  if (error || !data) return { error: dbError(error) };
  redirect(`/g/${data}`);
}

/** Accepts a full invite link or just the code. */
function extractCode(input: string) {
  const trimmed = input.trim();
  const match = /\/join\/([a-z0-9]+)/i.exec(trimmed);
  return (match ? match[1] : trimmed).toLowerCase();
}

export async function joinGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  const { error } = await supabase.rpc("regenerate_invite", { p_group: groupId });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function reorderRotation(groupId: string, order: string[]): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId) || !order.every(isUuid)) return { error: "Unknown group." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_rotation", { p_group: groupId, p_order: order });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function leaveGroup(groupId: string): Promise<ActionState> {
  await requireUser();
  if (!isUuid(groupId)) return { error: "Unknown group." };
  const supabase = await createClient();

  const before = await supabase.from("rounds").select("id, host_id").eq("group_id", groupId).neq("status", "closed").maybeSingle();
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
