"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUuid, requireUser } from "@/lib/data";
import { dbError, zodFieldErrors, type ActionState } from "@/lib/actions";

const suggestionSchema = z.object({
  group_id: z.string().refine(isUuid, "Unknown group."),
  title: z.string().trim().min(3, "Write what you'd like to learn about.").max(120, "Keep it under 120 characters."),
  pitch: z.string().trim().max(600, "Keep this under 600 characters.").optional(),
});

export async function addSuggestion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = suggestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .insert({ group_id: parsed.data.group_id, author_id: user.id, title: parsed.data.title, pitch: parsed.data.pitch || null })
    .select("id")
    .single();
  if (error) return { error: dbError(error) };
  // Authors back their own idea.
  await supabase.from("suggestion_votes").insert({ suggestion_id: data.id, user_id: user.id });
  refresh();
  return { ok: true };
}

export async function setVote(suggestionId: string, voted: boolean): Promise<ActionState> {
  const user = await requireUser();
  if (!isUuid(suggestionId)) return { error: "Unknown suggestion." };
  const supabase = await createClient();
  const { error } = voted
    ? await supabase.from("suggestion_votes").upsert({ suggestion_id: suggestionId, user_id: user.id }, { ignoreDuplicates: true })
    : await supabase.from("suggestion_votes").delete().eq("suggestion_id", suggestionId).eq("user_id", user.id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function deleteSuggestion(suggestionId: string): Promise<ActionState> {
  await requireUser();
  if (!isUuid(suggestionId)) return { error: "Unknown suggestion." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("suggestions").delete({ count: "exact" }).eq("id", suggestionId);
  if (error) return { error: dbError(error) };
  if (!count) return { error: "Only the person who suggested it can remove it." };
  refresh();
  return { ok: true };
}
