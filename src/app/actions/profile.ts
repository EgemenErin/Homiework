"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { dbError, safeNext, zodFieldErrors, type ActionState } from "@/lib/actions";

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Add the name your friends know you by.").max(40, "Keep it under 40 characters."),
  avatar_color: z.enum(["ink", "red", "green", "plum", "ochre", "teal"]),
});

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    avatar_color: formData.get("avatar_color") ?? "ink",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: dbError(error) };

  const next = formData.get("next");
  if (next) redirect(safeNext(next));
  refresh();
  return { ok: true };
}
