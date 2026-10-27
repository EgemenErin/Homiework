"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createLocalDemoClient, isLocalDemoMode } from "@/lib/supabase/local-store";
import { safeNext } from "@/lib/actions";

const emailSchema = z.email("Enter an email address like name@example.com.");

const TEST_PHONES = new Set([
  "+15550101001",
  "+15550101002",
  "+15550101003",
  "+15550101004",
  "+15550101005",
  "+15550109999",
]);

export type LoginMode = "phone" | "email";

export type LoginState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  mode?: LoginMode;
  email?: string;
  phone?: string;
  sent?: boolean;
  previewMessage?: string;
} | null;

export async function normalizePhoneInput(raw: string): Promise<string | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let cleaned = trimmed.replace(/[\s().-]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  } else if (!cleaned.startsWith("+")) {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 10) {
      cleaned = `+1${digits}`;
    } else if (digits.length >= 8 && digits.length <= 15) {
      cleaned = `+${digits}`;
    }
  }
  if (!/^\+\d{8,15}$/.test(cleaned)) return null;
  return cleaned;
}

async function storeFallbackOtp(
  target: string,
  channel: "sms" | "email",
  code: string,
): Promise<string> {
  const host = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;
    } catch {
      return "localhost";
    }
  })();
  const message =
    channel === "sms"
      ? `Your Homiework sign-in code is ${code}\n\n@${host} #${code}`
      : `Your Homiework sign-in code is ${code}`;
  try {
    const admin = isLocalDemoMode()
      ? await createLocalDemoClient(true)
      : createAdminClient();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await admin.from("auth_otp_codes").upsert({
      target,
      channel,
      code,
      message,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("[auth] storeFallbackOtp", err);
  }
  return message;
}

async function signInWithAdminToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opts: { email?: string; phone?: string },
): Promise<boolean> {
  if (isLocalDemoMode()) {
    const { error } = opts.phone
      ? await supabase.auth.verifyOtp({
          phone: opts.phone,
          token: "123456",
          type: "sms",
        })
      : await supabase.auth.verifyOtp({
          email: opts.email ?? "",
          token: "123456",
          type: "email",
        });
    return !error;
  }

  try {
    const admin = createAdminClient();
    let authEmail = opts.email?.trim().toLowerCase() ?? "";

    if (opts.phone && !authEmail) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, email")
        .eq("phone", opts.phone)
        .maybeSingle();
      if (existingProfile?.email) {
        authEmail = existingProfile.email;
      } else {
        const digits = opts.phone.replace(/\D/g, "");
        authEmail = `${digits}@phone.homiework.app`;
      }
    }

    if (!authEmail) return false;

    await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: opts.phone ? { phone: opts.phone } : undefined,
    });

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[auth] generateLink", linkError?.message);
      return false;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });

    if (verifyError) {
      console.error("[auth] verifyOtp hashed_token", verifyError.message);
      return false;
    }

    if (opts.phone && linkData.user?.id) {
      await admin
        .from("profiles")
        .update({ phone: opts.phone, email: authEmail })
        .eq("id", linkData.user.id);
    }

    return true;
  } catch (err) {
    console.error("[auth] signInWithAdminToken", err);
    return false;
  }
}

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mode: LoginMode = formData.get("mode") === "phone" ? "phone" : "email";
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();

  if (mode === "phone") {
    const rawPhone = String(formData.get("phone") ?? "");
    const phone = await normalizePhoneInput(rawPhone);
    if (!phone) {
      return {
        mode: "phone",
        phone: rawPhone,
        error: "Enter a phone number with country code, like +1 555 010 1001.",
      };
    }

    const isTestPhone = TEST_PHONES.has(phone);
    const fallbackCode = isTestPhone ? "123456" : String(randomInt(100000, 1000000));
    const smsMessage = await storeFallbackOtp(phone, "sms", fallbackCode);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });

    if (error) {
      // When an external SMS gateway (Twilio/Vonage) is not configured on Supabase yet,
      // deliver the OTP via our Supabase auth_otp_codes inbox & show the preview message.
      return {
        mode: "phone",
        phone,
        sent: true,
        previewMessage: smsMessage,
      };
    }

    return {
      mode: "phone",
      phone,
      sent: true,
      previewMessage: isTestPhone || isLocalDemoMode() ? smsMessage : undefined,
    };
  }

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) {
    return { mode: "email", error: parsed.error.issues[0].message };
  }

  const email = parsed.data;
  const fallbackCode = email.endsWith("@homiework.test")
    ? "123456"
    : String(randomInt(100000, 1000000));
  const emailMessage = await storeFallbackOtp(email, "email", fallbackCode);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}${next}`, shouldCreateUser: true },
  });

  if (error) {
    console.warn("[auth] email signInWithOtp fallback active:", error.message);
    return {
      mode: "email",
      email,
      sent: true,
      previewMessage: emailMessage,
    };
  }

  return {
    mode: "email",
    email,
    sent: true,
    previewMessage: isLocalDemoMode() ? emailMessage : undefined,
  };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mode: LoginMode = formData.get("mode") === "phone" ? "phone" : "email";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = (await normalizePhoneInput(rawPhone)) ?? rawPhone;
  const token = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const next = safeNext(formData.get("next"));

  if (!/^\d{6}$/.test(token)) {
    return {
      mode,
      email,
      phone,
      sent: true,
      error:
        mode === "phone"
          ? "The code is the 6 digits in the text message."
          : "The code is the 6 digits in the email.",
    };
  }

  const supabase = await createClient();

  if (mode === "phone") {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (!error) {
      redirect(next);
    }

    // Check server-side OTP inbox (used for test numbers or when external SMS provider is not attached)
    try {
      const admin = isLocalDemoMode()
        ? await createLocalDemoClient(true)
        : createAdminClient();
      const { data: rawOtpRow } = await admin
        .from("auth_otp_codes")
        .select("*")
        .eq("target", phone)
        .eq("channel", "sms")
        .maybeSingle();
      const otpRow = rawOtpRow as { code?: string; expires_at?: string } | null;

      const validOtp =
        (otpRow &&
          otpRow.code === token &&
          otpRow.expires_at &&
          new Date(otpRow.expires_at).getTime() > Date.now()) ||
        (TEST_PHONES.has(phone) && token === "123456");

      if (validOtp) {
        if (otpRow) {
          await admin.from("auth_otp_codes").delete().eq("target", phone);
        }
        const signedIn = await signInWithAdminToken(supabase, { phone });
        if (signedIn) {
          redirect(next);
        }
      }
    } catch (err) {
      console.error("[auth] phone fallback verify", err);
    }

    return {
      mode: "phone",
      phone,
      sent: true,
      error: "That code didn't work. It may have expired, so ask for a new one.",
    };
  }

  // Email verification: try standard email OTP, then signup OTP, then fallback OTP inbox
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (!error) {
    redirect(next);
  }
  const { error: signupError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (!signupError) {
    redirect(next);
  }

  try {
    const admin = isLocalDemoMode()
      ? await createLocalDemoClient(true)
      : createAdminClient();
    const { data: rawOtpRow } = await admin
      .from("auth_otp_codes")
      .select("*")
      .eq("target", email)
      .eq("channel", "email")
      .maybeSingle();
    const otpRow = rawOtpRow as { code?: string; expires_at?: string } | null;

    const validOtp =
      (otpRow &&
        otpRow.code === token &&
        otpRow.expires_at &&
        new Date(otpRow.expires_at).getTime() > Date.now()) ||
      (email.endsWith("@homiework.test") && token === "123456");

    if (validOtp) {
      if (otpRow) {
        await admin.from("auth_otp_codes").delete().eq("target", email);
      }
      const signedIn = await signInWithAdminToken(supabase, { email });
      if (signedIn) {
        redirect(next);
      }
    }
  } catch (err) {
    console.error("[auth] email fallback verify", err);
  }

  return {
    mode: "email",
    email,
    sent: true,
    error: "That code didn't work. It may have expired, so ask for a new one.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
