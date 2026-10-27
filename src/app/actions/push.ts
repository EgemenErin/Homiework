"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { dbError, type ActionState } from "@/lib/actions";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<ActionState> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "This browser sent an invalid subscription." };
  const supabase = await createClient();
  // Endpoint is unique; if this device was registered to someone else, it's re-owned by RLS-safe delete+insert.
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (error) return { error: dbError(error) };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: dbError(error) };
  return { ok: true };
}
