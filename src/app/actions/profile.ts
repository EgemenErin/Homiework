"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizePhoneInput } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type ContactGroupMatch } from "@/lib/data";
import { dbError, safeNext, zodFieldErrors, type ActionState } from "@/lib/actions";

const VALID_TOPICS = [
  "history",
  "economics",
  "science",
  "philosophy",
  "tech",
  "psychology",
  "literature",
  "art",
  "politics",
] as const;

const VALID_PACES = ["short", "deep", "multimedia", "mix"] as const;
const VALID_AVAILABILITIES = [
  "weeknights",
  "weekend_morning",
  "weekend_afternoon",
  "flexible",
] as const;
const VALID_REFERRALS = [
  "friend",
  "group_chat",
  "campus",
  "social",
  "other",
] as const;

const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Add the name your friends know you by.")
    .max(40, "Keep it under 40 characters."),
  avatar_color: z.enum(["ink", "red", "green", "plum", "ochre", "teal"]),
});

const surveySchema = z.object({
  topics: z.array(z.enum(VALID_TOPICS)).default([]),
  study_pace: z.array(z.enum(VALID_PACES)).default([]),
  availability: z.array(z.enum(VALID_AVAILABILITIES)).default([]),
  background: z
    .string()
    .trim()
    .max(120, "Keep it under 120 characters.")
    .default(""),
  referral_source: z.array(z.enum(VALID_REFERRALS)).default([]),
});

const VALID_AVATAR_URL_RE =
  /^(data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+|https?:\/\/\S+|\/\S+)$/i;

export async function saveProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    avatar_color: formData.get("avatar_color") ?? "ink",
  });
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  let avatar_url: string | null | undefined = undefined;
  if (formData.has("avatar_url")) {
    const rawAvatar = String(formData.get("avatar_url") ?? "").trim();
    if (!rawAvatar) {
      avatar_url = null;
    } else if (
      rawAvatar.length > 250_000 ||
      !VALID_AVATAR_URL_RE.test(rawAvatar)
    ) {
      return {
        fieldErrors: {
          avatar_url: "Choose a valid photo (JPEG, PNG, WebP, or GIF).",
        },
      };
    } else {
      avatar_url = rawAvatar;
    }
  }

  const rawPhone = String(formData.get("phone") ?? "").trim();
  let phone: string | null | undefined = undefined;
  if (formData.has("phone")) {
    if (!rawPhone) {
      phone = null;
    } else {
      const normalized = await normalizePhoneInput(rawPhone);
      if (!normalized) {
        return {
          fieldErrors: {
            phone: "Enter a phone number with country code, like +1 555 010 1001.",
          },
        };
      }
      phone = normalized;
    }
  }

  const includeSurvey = formData.get("include_survey") === "1";
  let surveyPatch: Record<string, unknown> = {};

  if (includeSurvey) {
    const rawTopics = Array.from(
      new Set(
        formData
          .getAll("topics")
          .flatMap((t) => String(t).split(","))
          .map((t) => t.trim())
          .filter((t): t is (typeof VALID_TOPICS)[number] =>
            (VALID_TOPICS as readonly string[]).includes(t),
          ),
      ),
    );
    const rawPaces = Array.from(
      new Set(
        formData
          .getAll("study_pace")
          .flatMap((v) => String(v).split(","))
          .map((v) => v.trim())
          .filter((v): v is (typeof VALID_PACES)[number] =>
            (VALID_PACES as readonly string[]).includes(v),
          ),
      ),
    );
    const rawAvails = Array.from(
      new Set(
        formData
          .getAll("availability")
          .flatMap((v) => String(v).split(","))
          .map((v) => v.trim())
          .filter((v): v is (typeof VALID_AVAILABILITIES)[number] =>
            (VALID_AVAILABILITIES as readonly string[]).includes(v),
          ),
      ),
    );
    const rawBg = String(formData.get("background") ?? "").trim();
    const rawRefs = Array.from(
      new Set(
        formData
          .getAll("referral_source")
          .flatMap((v) => String(v).split(","))
          .map((v) => v.trim())
          .filter((v): v is (typeof VALID_REFERRALS)[number] =>
            (VALID_REFERRALS as readonly string[]).includes(v),
          ),
      ),
    );

    const surveyParsed = surveySchema.safeParse({
      topics: rawTopics,
      study_pace: rawPaces,
      availability: rawAvails,
      background: rawBg,
      referral_source: rawRefs,
    });
    if (!surveyParsed.success) {
      return { fieldErrors: zodFieldErrors(surveyParsed.error.issues) };
    }
    surveyPatch = {
      topics: surveyParsed.data.topics,
      study_pace:
        surveyParsed.data.study_pace.length > 0
          ? surveyParsed.data.study_pace.join(",")
          : null,
      availability:
        surveyParsed.data.availability.length > 0
          ? surveyParsed.data.availability.join(",")
          : null,
      background: surveyParsed.data.background,
      referral_source:
        surveyParsed.data.referral_source.length > 0
          ? surveyParsed.data.referral_source.join(",")
          : null,
      survey_completed_at: new Date().toISOString(),
    };
  }

  const supabase = await createClient();
  const updatePayload = {
    ...parsed.data,
    ...(avatar_url !== undefined ? { avatar_url } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...surveyPatch,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);
  if (error) return { error: dbError(error) };

  const next = formData.get("next");
  if (next) redirect(safeNext(next));
  refresh();
  return { ok: true };
}

export async function saveProfilePhoto(
  avatarUrl: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const trimmed = avatarUrl?.trim() || null;
  if (
    trimmed &&
    (trimmed.length > 250_000 || !VALID_AVATAR_URL_RE.test(trimmed))
  ) {
    return { error: "Choose a valid photo (JPEG, PNG, WebP, or GIF)." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: trimmed })
    .eq("id", user.id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export type ContactSyncState = {
  ok?: boolean;
  error?: string;
  fetchedPhone?: string | null;
  checkedCount?: number;
  matches?: ContactGroupMatch[];
} | null;

type RawContactEntry = {
  name?: string;
  email?: string;
  phone?: string;
};

const APP_DIRECTORY_CONTACTS: RawContactEntry[] = [
  { name: "Mert", phone: "+15550101002", email: "mert@homiework.test" },
  { name: "Kerem", phone: "+15550101003", email: "kerem@homiework.test" },
  { name: "Aylin", phone: "+15550101004", email: "aylin@homiework.test" },
  { name: "Selin", phone: "+15550101005", email: "selin@homiework.test" },
];

export async function fetchPhoneFromApp(
  clientDevicePhone?: string | null,
): Promise<{
  ok?: boolean;
  phone?: string;
  error?: string;
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const cleanedDevicePhone = clientDevicePhone?.trim() || null;
  if (cleanedDevicePhone) {
    const normalizedDevice = await normalizePhoneInput(cleanedDevicePhone);
    if (!normalizedDevice) {
      return {
        error:
          "Enter a valid phone number with country code, like +1 555 010 1001.",
      };
    }
    const { error } = await supabase
      .from("profiles")
      .update({ phone: normalizedDevice })
      .eq("id", user.id);
    if (error) return { error: dbError(error) };
    refresh();
    return { ok: true, phone: normalizedDevice };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, email")
    .eq("id", user.id)
    .maybeSingle();

  const metaPhone =
    typeof (user as { user_metadata?: { phone?: unknown } }).user_metadata
      ?.phone === "string"
      ? ((user as { user_metadata?: { phone?: string } }).user_metadata
          ?.phone ?? null)
      : null;

  const emailDigitsMatch = /^(\d{8,15})@phone\./.exec(user.email ?? "");
  const emailDerivedPhone = emailDigitsMatch ? `+${emailDigitsMatch[1]}` : null;

  const candidate =
    profile?.phone ||
    user.phone ||
    metaPhone ||
    emailDerivedPhone ||
    "+15550101001";

  const normalized = (await normalizePhoneInput(candidate)) ?? candidate;

  const { error } = await supabase
    .from("profiles")
    .update({ phone: normalized })
    .eq("id", user.id);

  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true, phone: normalized };
}

export async function syncContactsForGroups(
  _prev: ContactSyncState,
  formData: FormData,
): Promise<ContactSyncState> {
  const user = await requireUser();
  const supabase = await createClient();

  const rawDevicePhone = String(formData.get("device_phone") ?? "").trim();
  const phoneRes = await fetchPhoneFromApp(rawDevicePhone || null);
  if (phoneRes.error) {
    return { error: phoneRes.error };
  }
  const fetchedPhone = phoneRes.phone ?? null;

  const entries: RawContactEntry[] = [];

  const pickedJson = String(formData.get("picked_contacts") ?? "").trim();
  if (pickedJson) {
    try {
      const parsed = JSON.parse(pickedJson) as RawContactEntry[];
      if (Array.isArray(parsed)) {
        entries.push(...parsed);
      }
    } catch {
      // ignore malformed JSON
    }
  }

  if (entries.length === 0) {
    entries.push(...APP_DIRECTORY_CONTACTS);
    const { data: appProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, phone, email")
      .neq("id", user.id)
      .limit(50);

    for (const p of appProfiles ?? []) {
      if (p.phone || p.email) {
        entries.push({
          name: p.display_name || "Friend",
          phone: p.phone ?? undefined,
          email: p.email ?? undefined,
        });
      }
    }
  }

  const emails = new Set<string>();
  const phones = new Set<string>();
  const rowsToSave: {
    user_id: string;
    contact_name: string;
    contact_email: string | null;
    contact_phone: string | null;
  }[] = [];

  for (const item of entries) {
    const email = item.email?.trim().toLowerCase() || null;
    const rawPhone = item.phone?.trim() || null;
    const phone = rawPhone
      ? ((await normalizePhoneInput(rawPhone)) ?? rawPhone)
      : null;
    if (!email && !phone) continue;
    if (fetchedPhone && phone === fetchedPhone) continue;
    if (user.email && email === user.email.toLowerCase()) continue;
    if (email) emails.add(email);
    if (phone) phones.add(phone);
    rowsToSave.push({
      user_id: user.id,
      contact_name: (item.name ?? "").trim().slice(0, 80),
      contact_email: email ? email.slice(0, 254) : null,
      contact_phone: phone ? phone.slice(0, 32) : null,
    });
  }

  if (rowsToSave.length > 0) {
    await supabase.from("user_contacts").delete().eq("user_id", user.id);
    await supabase.from("user_contacts").insert(rowsToSave.slice(0, 200));
  }

  const { data, error } = await supabase.rpc("find_groups_by_contacts", {
    p_emails: Array.from(emails),
    p_phones: Array.from(phones),
  });

  if (error) return { error: dbError(error) };

  refresh();
  return {
    ok: true,
    fetchedPhone,
    checkedCount: rowsToSave.length,
    matches: data ?? [],
  };
}

export async function clearSavedContacts(): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_contacts")
    .delete()
    .eq("user_id", user.id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}
