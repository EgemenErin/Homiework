"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/actions";

const emailSchema = z.email("Enter an email address like name@example.com.");

export type LoginState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  email?: string;
  sent?: boolean;
} | null;

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${site}${next}`, shouldCreateUser: true },
  });
  if (error) {
    if (error.status === 429) {
      return { email: parsed.data, error: "Too many emails sent. Wait a minute, then ask for a new code." };
    }
    console.error("[auth] signInWithOtp", error.message);
    return { email: parsed.data, error: "The email didn't send. Check the address and try again." };
  }
  return { email: parsed.data, sent: true };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const next = safeNext(formData.get("next"));
  if (!/^\d{6}$/.test(token)) {
    return { email, sent: true, error: "The code is the 6 digits in the email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { email, sent: true, error: "That code didn't work. It may have expired, so ask for a new one." };
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
