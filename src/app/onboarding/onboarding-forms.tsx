"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type TouchEvent,
} from "react";
import { flushSync } from "react-dom";
import { createGroup, joinGroup } from "@/app/actions/groups";
import {
  clearSavedContacts,
  fetchPhoneFromApp,
  saveProfile,
  saveProfilePhoto,
  syncContactsForGroups,
  type ContactSyncState,
} from "@/app/actions/profile";
import { StudyCrewIllustration } from "@/app/login/login-form";
import { AVATAR_COLORS, Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";
import type { ContactGroupMatch, FullProfile } from "@/lib/data";
import { WEEKDAYS } from "@/lib/dates";
import { triggerHaptic } from "@/lib/haptics";

export const TOPIC_OPTIONS = [
  { value: "history", label: "History" },
  { value: "economics", label: "Economics" },
  { value: "science", label: "Science" },
  { value: "philosophy", label: "Philosophy" },
  { value: "tech", label: "Tech & AI" },
  { value: "psychology", label: "Psychology" },
  { value: "literature", label: "Literature" },
  { value: "art", label: "Art & Film" },
  { value: "politics", label: "Society & Policy" },
] as const;

export const STUDY_PACE_OPTIONS = [
  { value: "short", label: "Quick reads (15 min)" },
  { value: "deep", label: "Deep dives (45 min)" },
  { value: "multimedia", label: "Podcasts & videos" },
  { value: "mix", label: "A mix of everything" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "weeknights", label: "Weeknights" },
  { value: "weekend_morning", label: "Weekend mornings" },
  { value: "weekend_afternoon", label: "Weekend afternoons" },
  { value: "flexible", label: "Flexible" },
] as const;

export const REFERRAL_OPTIONS = [
  { value: "friend", label: "A friend" },
  { value: "group_chat", label: "Group chat" },
  { value: "campus", label: "Campus or school" },
  { value: "social", label: "Social media" },
  { value: "other", label: "Somewhere else" },
] as const;

const APP_GUIDE_CARDS = [
  {
    icon: Sparkles,
    badge: "Week by week",
    title: "One friend hosts each week",
    body: "The turn rotates through your crew. Whoever is up picks a question everyone is curious about and attaches 1 to 3 links.",
    sample: "Week 3 · Set by Kerem",
  },
  {
    icon: BookOpen,
    badge: "At your own pace",
    title: "Do the homework on your own",
    body: "Read, watch, or listen whenever you have a spare half hour, then tap I did the homework to stamp the weekly handout.",
    sample: "3 of 5 done with the homework",
  },
  {
    icon: Users,
    badge: "Meetup night",
    title: "Meet up, talk it out & pass the pen",
    body: "Gather on your usual evening, argue about what you learned, close the round to build your streak, and pass the turn.",
    sample: "Due Thursday · 19:00",
  },
] as const;

type ViewTransitionDoc = Document & {
  startViewTransition?: (
    arg:
      | (() => void)
      | { update: () => void; types?: string[] },
  ) => { finished: Promise<void> };
};

/**
 * Runs a state update inside a directional View Transition (when supported)
 * and routes keyboard/screen-reader focus to the new step heading afterward.
 */
function runDirectionalTransition(
  direction: "forward" | "backward",
  updateDOM: () => void,
  focusTarget?: () => HTMLElement | null,
) {
  triggerHaptic("light");
  if (typeof document === "undefined") {
    updateDOM();
    return;
  }
  const doc = document as ViewTransitionDoc;
  if (typeof doc.startViewTransition !== "function") {
    updateDOM();
    requestAnimationFrame(() => {
      focusTarget?.()?.focus({ preventScroll: true });
    });
    return;
  }
  try {
    const transition = doc.startViewTransition({
      update: () => {
        flushSync(() => {
          updateDOM();
        });
      },
      types: [direction],
    });
    transition.finished.finally(() => {
      focusTarget?.()?.focus({ preventScroll: true });
    });
  } catch {
    updateDOM();
    requestAnimationFrame(() => {
      focusTarget?.()?.focus({ preventScroll: true });
    });
  }
}

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      properties: string[],
      options?: { multiple?: boolean },
    ) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]>;
  };
};

async function readImageFileAsCroppedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 12 MB.");
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode that image."));
      el.src = rawDataUrl;
    });

    const targetSize = 224;
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawDataUrl;

    const minSide = Math.min(img.naturalWidth || targetSize, img.naturalHeight || targetSize);
    const sx = Math.max(0, ((img.naturalWidth || targetSize) - minSide) / 2);
    const sy = Math.max(0, ((img.naturalHeight || targetSize) - minSide) / 2);

    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

    const webp = canvas.toDataURL("image/webp", 0.84);
    if (webp.startsWith("data:image/webp") && webp.length <= 240_000) {
      return webp;
    }
    const jpeg = canvas.toDataURL("image/jpeg", 0.84);
    if (jpeg.length <= 240_000) {
      return jpeg;
    }
  } catch {
    // Fall back to raw data URL if canvas decoding fails in headless environments
  }

  if (rawDataUrl.length > 240_000) {
    throw new Error("That photo is too large. Try a smaller image.");
  }
  return rawDataUrl;
}

function ProfilePhotoPicker({
  name,
  color,
  avatarUrl,
  onChangeAvatarUrl,
  fieldError,
}: {
  name: string;
  color: FullProfile["avatar_color"];
  avatarUrl: string;
  onChangeAvatarUrl: (next: string) => void;
  fieldError?: string;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSavingPhoto, startPhotoSave] = useTransition();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    try {
      const croppedDataUrl = await readImageFileAsCroppedDataUrl(file);
      triggerHaptic("success");
      onChangeAvatarUrl(croppedDataUrl);
      startPhotoSave(async () => {
        const res = await saveProfilePhoto(croppedDataUrl);
        if (res.error) setPhotoError(res.error);
      });
    } catch (err) {
      triggerHaptic("error");
      setPhotoError(
        err instanceof Error ? err.message : "Could not upload that photo.",
      );
    }
  }

  function handleRemovePhoto() {
    triggerHaptic("light");
    setPhotoError(null);
    onChangeAvatarUrl("");
    startPhotoSave(async () => {
      await saveProfilePhoto(null);
    });
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            fileInputRef.current?.click();
          }}
          aria-label={avatarUrl ? "Change profile picture" : "Upload profile picture"}
          className="group relative inline-flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-95 transition-transform"
        >
          <div key={`${color}-${avatarUrl ? "photo" : "ink"}`} className="animate-chip-pop">
            <Avatar
              profile={{
                display_name: name || "You",
                avatar_color: color,
                avatar_url: avatarUrl || null,
              }}
              size="lg"
            />
          </div>
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 inline-flex size-6 items-center justify-center rounded-full border-2 border-desk bg-ink text-paper shadow-2xs group-hover:bg-ink-soft"
          >
            <Camera className="size-3.5" />
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSavingPhoto}
            onClick={() => fileInputRef.current?.click()}
          >
            {isSavingPhoto
              ? "Saving photo…"
              : avatarUrl
                ? "Change photo"
                : "Upload photo"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              variant="tertiary"
              disabled={isSavingPhoto}
              onClick={handleRemovePhoto}
            >
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>
      <FormError message={photoError ?? fieldError} />
    </div>
  );
}

async function tryPickNumberFromPhoneApp(): Promise<string | null> {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as ContactPickerNavigator;
  if (typeof nav.contacts?.select !== "function") return null;
  try {
    const selected = await nav.contacts.select(["tel", "name"], {
      multiple: false,
    });
    const firstTel = selected?.[0]?.tel?.find((t) => Boolean(t?.trim()));
    return firstTel?.trim() ?? null;
  } catch {
    return null;
  }
}

function PhoneConsentField({
  phone,
  onChangePhone,
  fieldError,
}: {
  phone: string;
  onChangePhone: (next: string) => void;
  fieldError?: string;
}) {
  const telAutofillId = useId();
  const [askingConsent, setAskingConsent] = useState(false);
  const [deviceTelInput, setDeviceTelInput] = useState("");
  const [fetching, startFetch] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <input type="hidden" name="phone" value={phone} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">Your phone number</span>
        <span className="text-sm text-pencil">Optional</span>
      </div>
      <p className="text-sm text-pencil">
        Lets friends who have your number in their Phone contacts find your study group automatically.
      </p>

      {phone ? (
        <div className="animate-reveal flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-paper px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-base font-semibold text-ink">
            <Check aria-hidden className="size-4 text-red stroke-[2.75]" />
            <span>{phone}</span>
            <span className="text-xs font-normal text-pencil">
              (from Phone app)
            </span>
          </span>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => {
              onChangePhone("");
              setDeviceTelInput("");
              setAskingConsent(false);
            }}
          >
            Disconnect
          </Button>
        </div>
      ) : askingConsent ? (
        <div
          role="region"
          aria-labelledby="profile-phone-consent-heading"
          className="animate-reveal space-y-3 rounded-md border border-rule bg-paper p-4"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-paper"
            >
              <Phone className="size-4" />
            </span>
            <div className="space-y-1">
              <p
                id="profile-phone-consent-heading"
                className="font-semibold text-ink"
              >
                Use your Phone app to fetch your number?
              </p>
              <p className="text-sm text-pencil">
                Homiework will ask your phone&apos;s built-in Phone &amp; Contacts app for your number so friends can match with your study group.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label
              htmlFor={telAutofillId}
              className="block text-xs font-semibold text-pencil"
            >
              Tap below for your phone&apos;s &ldquo;My Number&rdquo; autofill, or tap Allow to fetch directly
            </label>
            <input
              id={telAutofillId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              value={deviceTelInput}
              onChange={(e) => setDeviceTelInput(e.target.value)}
              placeholder="Auto-fetch from Phone app (+1 555…)"
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              haptic="success"
              disabled={fetching}
              onClick={() => {
                setFetchError(null);
                startFetch(async () => {
                  let candidate = deviceTelInput.trim() || null;
                  if (!candidate) {
                    candidate = await tryPickNumberFromPhoneApp();
                  }
                  const res = await fetchPhoneFromApp(candidate);
                  if (res.error) {
                    triggerHaptic("error");
                    setFetchError(res.error);
                    return;
                  }
                  if (res.phone) {
                    triggerHaptic("success");
                    onChangePhone(res.phone);
                    setAskingConsent(false);
                  }
                });
              }}
            >
              {fetching ? "Fetching from Phone app…" : "Allow access"}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              disabled={fetching}
              onClick={() => setAskingConsent(false)}
            >
              Not now
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setAskingConsent(true)}
          >
            <Phone aria-hidden className="mr-2 size-4" />
            Fetch number from Phone app
          </Button>
        </div>
      )}

      <FormError message={fetchError ?? fieldError} />
    </div>
  );
}

function parseMultiValue(
  raw: string | null | undefined,
  fallback: string[] = [],
): string[] {
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

function toggleInList(list: string[], val: string): string[] {
  return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
}

export function ProfileStepForm({
  profile,
  nextPath,
  includeSurvey = false,
  submitLabel = "Save name",
}: {
  profile: FullProfile | null;
  nextPath?: string;
  includeSurvey?: boolean;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProfile,
    null,
  );
  const [name, setName] = useState(profile?.display_name ?? "");
  const [color, setColor] = useState<FullProfile["avatar_color"]>(
    profile?.avatar_color ?? "ink",
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [topics, setTopics] = useState<string[]>(profile?.topics ?? []);
  const [studyPaces, setStudyPaces] = useState<string[]>(() =>
    parseMultiValue(profile?.study_pace, ["mix"]),
  );
  const [availabilities, setAvailabilities] = useState<string[]>(() =>
    parseMultiValue(profile?.availability, ["weeknights"]),
  );
  const [background, setBackground] = useState(profile?.background ?? "");
  const [referralSources, setReferralSources] = useState<string[]>(() =>
    parseMultiValue(profile?.referral_source, []),
  );

  function toggleTopic(val: string) {
    triggerHaptic("selection");
    setTopics((prev) => toggleInList(prev, val));
  }

  function toggleStudyPace(val: string) {
    triggerHaptic("selection");
    setStudyPaces((prev) => toggleInList(prev, val));
  }

  function toggleAvailability(val: string) {
    triggerHaptic("selection");
    setAvailabilities((prev) => toggleInList(prev, val));
  }

  function toggleReferralSource(val: string) {
    triggerHaptic("selection");
    setReferralSources((prev) => toggleInList(prev, val));
  }

  return (
    <form action={action} className="space-y-8">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {includeSurvey ? (
        <input type="hidden" name="include_survey" value="1" />
      ) : null}

      <div className="space-y-6">
        <ProfilePhotoPicker
          name={name}
          color={color}
          avatarUrl={avatarUrl}
          onChangeAvatarUrl={setAvatarUrl}
          fieldError={state?.fieldErrors?.avatar_url}
        />

        <div className="min-w-0">
          <Field
            label="What do your friends call you?"
            htmlFor="display_name"
            error={state?.fieldErrors?.display_name}
          >
            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ege"
              aria-invalid={Boolean(state?.fieldErrors?.display_name)}
              className={inputClass}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="font-semibold text-ink">Pick your ink colour</legend>
          <div className="flex flex-wrap gap-3 pt-1">
            {AVATAR_COLORS.map((c) => {
              const checked = color === c;
              return (
                <label
                  key={c}
                  className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border-2 px-3 py-1.5 text-sm font-semibold capitalize transition-all duration-150 active:scale-95 ${
                    checked
                      ? "animate-chip-pop border-ink bg-paper text-ink"
                      : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="avatar_color"
                    value={c}
                    checked={checked}
                    onChange={() => {
                      triggerHaptic("selection");
                      setColor(c);
                    }}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2">
                    <Avatar
                      profile={{ display_name: name || c, avatar_color: c }}
                      size="sm"
                    />
                    <span>{c}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <PhoneConsentField
          phone={phone}
          onChangePhone={setPhone}
          fieldError={state?.fieldErrors?.phone}
        />
      </div>

      {includeSurvey ? (
        <div className="space-y-8 border-t border-rule pt-8">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl text-ink">
              A quick note on how you study
            </h2>
            <p className="text-base text-pencil">
              Helps your group pick better first topics and times that fit everyone.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink">
              What topics are you curious about right now?
            </legend>
            <p className="text-sm text-pencil">Pick as many as you like.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {TOPIC_OPTIONS.map((t) => {
                const checked = topics.includes(t.value);
                return (
                  <label
                    key={t.value}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border-2 px-3.5 py-1.5 text-base font-semibold transition-all duration-150 active:scale-95 ${
                      checked
                        ? "animate-chip-pop border-ink bg-paper text-ink"
                        : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="topics"
                      value={t.value}
                      checked={checked}
                      onChange={() => toggleTopic(t.value)}
                      className="sr-only"
                    />
                    {checked ? (
                      <Check
                        aria-hidden
                        className="size-4 text-red stroke-[2.75]"
                      />
                    ) : null}
                    {t.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink">
              What kind of weekly homework do you like best?
            </legend>
            <p className="text-sm text-pencil">Pick as many as you like.</p>
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {STUDY_PACE_OPTIONS.map((opt) => {
                const checked = studyPaces.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border-2 px-3.5 py-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] ${
                      checked
                        ? "animate-chip-pop border-ink bg-paper text-ink"
                        : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="study_pace"
                      value={opt.value}
                      checked={checked}
                      onChange={() => toggleStudyPace(opt.value)}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                    {checked ? (
                      <Check
                        aria-hidden
                        className="size-4 shrink-0 text-red stroke-[2.75]"
                      />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink">
              When are you usually free to meet up?
            </legend>
            <p className="text-sm text-pencil">Pick as many as you like.</p>
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const checked = availabilities.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border-2 px-3.5 py-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] ${
                      checked
                        ? "animate-chip-pop border-ink bg-paper text-ink"
                        : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="availability"
                      value={opt.value}
                      checked={checked}
                      onChange={() => toggleAvailability(opt.value)}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                    {checked ? (
                      <Check
                        aria-hidden
                        className="size-4 shrink-0 text-red stroke-[2.75]"
                      />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="What do you study or do during the week?"
            htmlFor="background"
            optional
            hint="School, major, or day job."
            error={state?.fieldErrors?.background}
          >
            <input
              id="background"
              name="background"
              type="text"
              maxLength={120}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="e.g. History major, product designer, med student"
              className={inputClass}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink">
              How did you hear about Homiework?{" "}
              <span className="font-normal text-pencil">(optional)</span>
            </legend>
            <p className="text-sm text-pencil">Pick all that apply.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {REFERRAL_OPTIONS.map((opt) => {
                const checked = referralSources.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border-2 px-3.5 py-1.5 text-base font-semibold transition-all duration-150 active:scale-95 ${
                      checked
                        ? "animate-chip-pop border-ink bg-paper text-ink"
                        : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="referral_source"
                      value={opt.value}
                      checked={checked}
                      onChange={() => toggleReferralSource(opt.value)}
                      className="sr-only"
                    />
                    {checked ? (
                      <Check
                        aria-hidden
                        className="size-4 text-red stroke-[2.75]"
                      />
                    ) : null}
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}

      <FormError message={state?.error} />
      {state?.ok ? (
        <p role="status" className="animate-reveal text-sm font-semibold text-ink">
          Saved.
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ContactGroupFinder({
  initialMatches = [],
  initialContactsCount = 0,
  initialPhone = null,
}: {
  initialMatches?: ContactGroupMatch[];
  initialContactsCount?: number;
  initialPhone?: string | null;
}) {
  const finderTelId = useId();
  const [state, action, pending] = useActionState<ContactSyncState, FormData>(
    syncContactsForGroups,
    null,
  );
  const [joinState, joinAction, joining] = useActionState<
    ActionState,
    FormData
  >(joinGroup, null);
  const [pickedJson, setPickedJson] = useState("");
  const [devicePhone, setDevicePhone] = useState("");
  const [askingConsent, setAskingConsent] = useState(false);
  const [clearing, startClear] = useTransition();
  const [cleared, setCleared] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  const matches = cleared ? [] : (state?.matches ?? initialMatches);
  const checkedCount = cleared
    ? 0
    : (state?.checkedCount ?? initialContactsCount);
  const linkedPhone = cleared
    ? null
    : (state?.fetchedPhone ?? (checkedCount > 0 ? initialPhone : null));

  async function handleAllowConsent() {
    triggerHaptic("success");
    setCleared(false);
    const nav = navigator as ContactPickerNavigator;
    if (typeof nav.contacts?.select === "function") {
      try {
        const selected = await nav.contacts.select(["name", "tel", "email"], {
          multiple: true,
        });
        if (selected && selected.length > 0) {
          const firstOwnTel = selected[0]?.tel?.find((t) => Boolean(t?.trim()));
          if (!devicePhone.trim() && firstOwnTel) {
            setDevicePhone(firstOwnTel.trim());
          }
          const normalized = selected.flatMap((c) => {
            const name = c.name?.[0] ?? "";
            const tels = c.tel ?? [];
            const emails = c.email ?? [];
            const out: { name?: string; phone?: string; email?: string }[] = [];
            for (const t of tels) out.push({ name, phone: t });
            for (const e of emails) out.push({ name, email: e });
            return out;
          });
          setPickedJson(JSON.stringify(normalized));
        }
      } catch {
        // Fall back to Phone app / directory sync on server
      }
    }
    setAskingConsent(false);
    requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  }

  function handleClear() {
    triggerHaptic("light");
    startClear(async () => {
      await clearSavedContacts();
      setPickedJson("");
      setDevicePhone("");
      setAskingConsent(false);
      setCleared(true);
    });
  }

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={action}
        onSubmit={() => setCleared(false)}
        className="space-y-3"
      >
        <input type="hidden" name="picked_contacts" value={pickedJson} />
        <input type="hidden" name="device_phone" value={devicePhone} />

        {askingConsent ? (
          <div
            role="region"
            aria-labelledby="consent-prompt-heading"
            className="animate-reveal space-y-3 rounded-md border border-rule bg-paper p-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-paper"
              >
                <Phone className="size-4" />
              </span>
              <div className="space-y-1">
                <p id="consent-prompt-heading" className="font-semibold text-ink">
                  Use your Phone app to fetch your number &amp; contacts?
                </p>
                <p className="text-sm text-pencil">
                  Homiework will ask your phone&apos;s Phone &amp; Contacts app for your number and check if your friends already run a study group.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label
                htmlFor={finderTelId}
                className="block text-xs font-semibold text-pencil"
              >
                Tap below for your phone&apos;s &ldquo;My Number&rdquo; autofill, or tap Allow to fetch directly
              </label>
              <input
                id={finderTelId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="done"
                value={devicePhone}
                onChange={(e) => setDevicePhone(e.target.value)}
                placeholder="Auto-fetch from Phone app (+1 555…)"
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                haptic="success"
                disabled={pending}
                onClick={handleAllowConsent}
              >
                {pending ? "Fetching from Phone app…" : "Allow access"}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                disabled={pending}
                onClick={() => setAskingConsent(false)}
              >
                Not now
              </Button>
            </div>
          </div>
        ) : checkedCount > 0 ? (
          <div className="animate-reveal flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-paper px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-sm text-ink">
              <Check aria-hidden className="size-4 text-red stroke-[2.75]" />
              <span>
                <span className="font-semibold">Fetched from Phone app</span>
                {linkedPhone ? (
                  <span className="text-pencil"> ({linkedPhone})</span>
                ) : null}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="tertiary"
                disabled={pending}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {pending ? "Checking…" : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                disabled={clearing}
                onClick={handleClear}
              >
                {clearing ? "Removing…" : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-pencil">
              Don&apos;t have the invite code handy? Use your Phone app to fetch your number and see if your friends already have a study group.
            </p>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={pending}
                onClick={() => setAskingConsent(true)}
                className="w-full"
              >
                <Phone aria-hidden className="mr-2 size-4" />
                {pending
                  ? "Fetching from Phone app…"
                  : "Fetch number from Phone app"}
              </Button>
            </div>
          </div>
        )}

        <FormError message={state?.error ?? joinState?.error} />
      </form>

      {state?.ok && matches.length === 0 ? (
        <p role="status" className="animate-reveal text-base text-pencil">
          No study groups matched your phone contacts yet. You can go back to start a group and send your friends the invite link.
        </p>
      ) : null}

      {matches.length > 0 ? (
        <div className="animate-reveal space-y-3">
          <h3 className="font-semibold text-ink">
            Study groups with people you know ({matches.length})
          </h3>
          <ul className="divide-y divide-rule border-y border-rule">
            {matches.map((g) => (
              <li
                key={g.group_id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-ink">
                    {g.group_name}
                  </p>
                  <p className="text-base text-ink">
                    With{" "}
                    <span className="font-semibold">
                      {g.matched_friends.join(", ")}
                    </span>
                  </p>
                  <p className="text-sm text-pencil">
                    {WEEKDAYS[g.meet_weekday] ?? "Weekly"} at{" "}
                    {String(g.meet_time).slice(0, 5)} ({g.member_count}{" "}
                    {g.member_count === 1 ? "member" : "members"})
                  </p>
                </div>

                <div>
                  {g.already_member ? (
                    <Link
                      href={`/g/${g.group_id}`}
                      onClick={() => triggerHaptic("light")}
                      className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
                    >
                      Open group
                    </Link>
                  ) : (
                    <form action={joinAction}>
                      <input type="hidden" name="code" value={g.invite_code} />
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        haptic="success"
                        disabled={joining}
                      >
                        {joining ? "Joining…" : `Join ${g.group_name}`}
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function CreateGroupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGroup,
    null,
  );
  const [tz] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="timezone" value={tz} />

      <Field
        label="Group name"
        htmlFor="group-name"
        hint="Use whatever your group chat is called."
        error={state?.fieldErrors?.name}
      >
        <input
          id="group-name"
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="The Homies"
          aria-invalid={Boolean(state?.fieldErrors?.name)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Usual meetup day"
          htmlFor="meet_weekday"
          error={state?.fieldErrors?.meet_weekday}
        >
          <select
            id="meet_weekday"
            name="meet_weekday"
            defaultValue="4"
            onChange={() => triggerHaptic("selection")}
            className={inputClass}
          >
            {WEEKDAYS.map((day, idx) => (
              <option key={day} value={idx}>
                {day}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Usual time"
          htmlFor="meet_time"
          hint={`In ${tz}`}
          error={state?.fieldErrors?.meet_time}
        >
          <input
            id="meet_time"
            name="meet_time"
            type="time"
            defaultValue="19:00"
            required
            className={inputClass}
          />
        </Field>
      </div>

      <FormError message={state?.error} />

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          haptic="success"
          disabled={pending}
          className="w-full"
        >
          {pending ? "Creating group…" : "Start a group"}
        </Button>
      </div>
    </form>
  );
}

export function JoinByCodeForm({
  submitVariant = "primary",
  submitSize = "lg",
}: {
  submitVariant?: "primary" | "secondary";
  submitSize?: "md" | "lg";
} = {}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    joinGroup,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Invite link or code"
        htmlFor="invite-code"
        hint="Paste the full link or just the code at the end."
        error={state?.fieldErrors?.code}
      >
        <input
          id="invite-code"
          name="code"
          type="text"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          required
          placeholder="homies2026"
          aria-invalid={Boolean(state?.fieldErrors?.code)}
          className={inputClass}
        />
      </Field>

      <FormError message={state?.error} />

      <div>
        <Button
          type="submit"
          variant={submitVariant}
          size={submitSize}
          haptic="success"
          disabled={pending}
          className="w-full"
        >
          {pending ? "Joining…" : "Join with invite"}
        </Button>
      </div>
    </form>
  );
}

function StepNavPill({
  onBack,
  onForward,
  backLabel = "Go back",
  forwardLabel = "Continue",
  disableBack = false,
  disableForward = false,
  submitForward = false,
}: {
  onBack?: () => void;
  onForward?: () => void;
  backLabel?: string;
  forwardLabel?: string;
  disableBack?: boolean;
  disableForward?: boolean;
  submitForward?: boolean;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-ink text-paper shadow-paper">
      <button
        type="button"
        aria-label={backLabel}
        disabled={disableBack || !onBack}
        onClick={() => {
          triggerHaptic("light");
          onBack?.();
        }}
        className="inline-flex h-12 w-14 items-center justify-center transition-colors hover:bg-ink-soft disabled:opacity-35 active:scale-95"
      >
        <ArrowLeft aria-hidden className="size-5" />
      </button>
      <span aria-hidden className="h-5 w-px bg-paper/25" />
      <button
        type={submitForward ? "submit" : "button"}
        aria-label={forwardLabel}
        disabled={disableForward}
        onClick={() => {
          triggerHaptic("medium");
          onForward?.();
        }}
        className="inline-flex h-12 w-14 items-center justify-center transition-colors hover:bg-ink-soft disabled:opacity-35 active:scale-95"
      >
        <ArrowRight aria-hidden className="size-5" />
      </button>
    </div>
  );
}

type OnboardingStepId =
  | "welcome-guide"
  | "profile-name"
  | "profile-study"
  | "profile-schedule"
  | "group-start"
  | "group-join";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Full-height conversational onboarding experience:
 * 1. Warm welcome + interactive guide through the app
 * 2. Your name & ink colour
 * 3. What you're curious about (topics & study pace)
 * 4. When you're free to meet
 * 5. Start a group
 * 6. Join a friend's group (invite code or consent-only phone fetch)
 */
export function OnboardingWizard({
  profile,
  initialMatches = [],
  initialContactsCount = 0,
}: {
  profile: FullProfile | null;
  initialMatches?: ContactGroupMatch[];
  initialContactsCount?: number;
}) {
  const hasName = Boolean(profile?.display_name?.trim());
  const hasSurvey = Boolean(profile?.survey_completed_at);
  const needsProfileSetup = !hasName || !hasSurvey;

  const [step, setStep] = useState<OnboardingStepId>(
    needsProfileSetup ? "welcome-guide" : "group-start",
  );
  const [guideSlide, setGuideSlide] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [greeting] = useState(getTimeGreeting);

  // Check URL hash (#join) so "I have an invite" opens directly on group-join when profile is ready
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hash === "#join" &&
      !needsProfileSetup
    ) {
      Promise.resolve().then(() => setStep("group-join"));
    }
  }, [needsProfileSetup]);

  // Profile wizard state
  const [profileState, profileAction, savingProfile] = useActionState<
    ActionState,
    FormData
  >(saveProfile, null);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [color, setColor] = useState<FullProfile["avatar_color"]>(
    profile?.avatar_color ?? "ink",
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [topics, setTopics] = useState<string[]>(profile?.topics ?? []);
  const [studyPaces, setStudyPaces] = useState<string[]>(() =>
    parseMultiValue(profile?.study_pace, ["mix"]),
  );
  const [availabilities, setAvailabilities] = useState<string[]>(() =>
    parseMultiValue(profile?.availability, ["weeknights"]),
  );
  const [background, setBackground] = useState(profile?.background ?? "");
  const [referralSources] = useState<string[]>(() =>
    parseMultiValue(profile?.referral_source, []),
  );

  // Touch gesture state for purposeful swipe navigation between pages
  const touchStartRef = useRef<{ x: number; y: number; interactive: boolean } | null>(
    null,
  );
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const isProfilePhase =
    step === "welcome-guide" ||
    step === "profile-name" ||
    step === "profile-study" ||
    step === "profile-schedule";

  const stepOrder: OnboardingStepId[] = isProfilePhase
    ? ["welcome-guide", "profile-name", "profile-study", "profile-schedule"]
    : ["group-start", "group-join"];

  const currentIdx = stepOrder.indexOf(step);
  const totalSteps = stepOrder.length;

  function goToStep(nextStep: OnboardingStepId, dir: "forward" | "backward") {
    runDirectionalTransition(
      dir,
      () => {
        setDirection(dir);
        setStep(nextStep);
      },
      () => stepHeadingRef.current,
    );
  }

  function handleContinueFromName() {
    if (!name.trim()) {
      triggerHaptic("error");
      setNameError("Add the name your friends know you by.");
      return;
    }
    setNameError(null);
    goToStep("profile-study", "forward");
  }

  function toggleTopic(val: string) {
    triggerHaptic("selection");
    setTopics((prev) => toggleInList(prev, val));
  }

  function toggleStudyPace(val: string) {
    triggerHaptic("selection");
    setStudyPaces((prev) => toggleInList(prev, val));
  }

  function toggleAvailability(val: string) {
    triggerHaptic("selection");
    setAvailabilities((prev) => toggleInList(prev, val));
  }

  function advanceGuideOrNext() {
    if (guideSlide < APP_GUIDE_CARDS.length - 1) {
      triggerHaptic("selection");
      setDirection("forward");
      setGuideSlide((s) => s + 1);
      return;
    }
    goToStep(needsProfileSetup ? "profile-name" : "group-start", "forward");
  }

  function backGuide() {
    if (guideSlide > 0) {
      triggerHaptic("selection");
      setDirection("backward");
      setGuideSlide((s) => s - 1);
    }
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const interactive = Boolean(
      target?.closest("input, textarea, select, button, a, label"),
    );
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, interactive };
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    if (!start || start.interactive) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
    const clamped = Math.max(-72, Math.min(72, dx * 0.45));
    setDragOffsetX(clamped);
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setDragOffsetX(0);
    if (!start || start.interactive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

    if (dx < -64) {
      // Swiped left -> Continue forward
      if (step === "welcome-guide") {
        advanceGuideOrNext();
      } else if (step === "profile-name") {
        handleContinueFromName();
      } else if (step === "profile-study") {
        goToStep("profile-schedule", "forward");
      } else if (step === "group-start") {
        goToStep("group-join", "forward");
      }
    } else if (dx > 64) {
      // Swiped right -> Go back
      if (step === "welcome-guide") {
        backGuide();
      } else if (step === "profile-name") {
        goToStep("welcome-guide", "backward");
      } else if (step === "profile-study") {
        goToStep("profile-name", "backward");
      } else if (step === "profile-schedule") {
        goToStep("profile-study", "backward");
      } else if (step === "group-join") {
        goToStep("group-start", "backward");
      } else if (step === "group-start") {
        goToStep("welcome-guide", "backward");
      }
    }
  }

  const enterClass =
    direction === "forward" ? "step-enter-forward" : "step-enter-backward";

  const activeGuide = APP_GUIDE_CARDS[guideSlide];
  const GuideIcon = activeGuide.icon;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex min-h-[calc(100dvh-5.5rem)] flex-col justify-between gap-6"
    >
      {/* Top progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-pencil">
          <span>
            {step === "welcome-guide"
              ? `Welcome · ${guideSlide + 1} of ${APP_GUIDE_CARDS.length}`
              : isProfilePhase
                ? `Step ${currentIdx + 1} of ${totalSteps}`
                : step === "group-start"
                  ? "Group setup · Start a group"
                  : "Group setup · Join with invite"}
          </span>

          {step === "welcome-guide" ? (
            <button
              type="button"
              onClick={() =>
                goToStep(
                  needsProfileSetup ? "profile-name" : "group-start",
                  "forward",
                )
              }
              className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
            >
              Skip intro
            </button>
          ) : !isProfilePhase ? (
            <button
              type="button"
              onClick={() => {
                setGuideSlide(0);
                goToStep("welcome-guide", "backward");
              }}
              className="font-semibold text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
            >
              How it works
            </button>
          ) : null}
        </div>

        <div
          aria-hidden
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))`,
          }}
        >
          {stepOrder.map((id, idx) => {
            const activeOrDone = idx <= currentIdx;
            return (
              <div
                key={id}
                className="h-1.5 overflow-hidden rounded-full bg-rule/80"
              >
                <div
                  className={`h-full rounded-full bg-ink transition-all duration-300 ease-out ${
                    activeOrDone ? "w-full" : "w-0"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main animated step body */}
      <div
        key={`${step}-${step === "welcome-guide" ? guideSlide : ""}`}
        style={
          dragOffsetX !== 0
            ? {
                transform: `translateX(${dragOffsetX}px)`,
                transition: "none",
              }
            : undefined
        }
        className={`${enterClass} my-auto flex flex-1 flex-col justify-between py-2`}
      >
        {step === "welcome-guide" ? (
          <section
            aria-labelledby="welcome-heading"
            className="flex flex-1 flex-col justify-between gap-6"
          >
            <div className="my-auto space-y-6">
              <StudyCrewIllustration />

              <div className="space-y-1.5 text-center">
                <h1
                  ref={stepHeadingRef}
                  id="welcome-heading"
                  tabIndex={-1}
                  className="font-serif text-2xl leading-tight text-ink outline-none"
                >
                  {greeting}
                  {name.trim() ? `, ${name.trim()}` : ""}. Welcome to Homiework.
                </h1>
                <p className="text-base text-pencil">
                  A weekly study club you run with your closest friends.
                </p>
              </div>

              {/* Interactive app walkthrough card */}
              <div className="paper-ruled relative rounded-md border border-rule/90 py-5 pr-5 pl-12 shadow-paper">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red">
                    <GuideIcon aria-hidden className="size-4" />
                    {activeGuide.badge}
                  </span>
                  <span className="highlighted px-1.5 text-xs font-semibold text-ink">
                    {activeGuide.sample}
                  </span>
                </div>

                <h2 className="mt-2 font-serif text-xl leading-snug text-ink">
                  {activeGuide.title}
                </h2>
                <p className="mt-1.5 text-base leading-relaxed text-pencil">
                  {activeGuide.body}
                </p>

                {/* Interactive slide dots */}
                <div className="mt-4 flex items-center gap-2">
                  {APP_GUIDE_CARDS.map((card, idx) => {
                    const active = idx === guideSlide;
                    return (
                      <button
                        key={card.title}
                        type="button"
                        aria-label={`Guide step ${idx + 1}: ${card.title}`}
                        onClick={() => {
                          triggerHaptic("selection");
                          setDirection(idx > guideSlide ? "forward" : "backward");
                          setGuideSlide(idx);
                        }}
                        className={`h-2 rounded-full transition-all duration-200 ${
                          active ? "w-6 bg-ink" : "w-2 bg-rule hover:bg-pencil"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-rule/70 pt-5">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={advanceGuideOrNext}
                className="flex-1 mr-4"
              >
                {guideSlide < APP_GUIDE_CARDS.length - 1
                  ? "Next"
                  : needsProfileSetup
                    ? "Set up your profile"
                    : "Continue to group setup"}
              </Button>
              <StepNavPill
                onBack={guideSlide > 0 ? backGuide : undefined}
                disableBack={guideSlide === 0}
                onForward={advanceGuideOrNext}
              />
            </div>
          </section>
        ) : null}

        {isProfilePhase && step !== "welcome-guide" ? (
          <form
            action={profileAction}
            className="flex flex-1 flex-col justify-between gap-6"
          >
            <input type="hidden" name="next" value="/onboarding" />
            <input type="hidden" name="include_survey" value="1" />
            <input type="hidden" name="display_name" value={name} />
            <input type="hidden" name="avatar_color" value={color} />
            <input type="hidden" name="avatar_url" value={avatarUrl} />
            <input type="hidden" name="phone" value={phone} />
            {topics.map((t) => (
              <input key={t} type="hidden" name="topics" value={t} />
            ))}
            {studyPaces.map((p) => (
              <input key={p} type="hidden" name="study_pace" value={p} />
            ))}
            {availabilities.map((a) => (
              <input key={a} type="hidden" name="availability" value={a} />
            ))}
            <input type="hidden" name="background" value={background} />
            {referralSources.map((r) => (
              <input key={r} type="hidden" name="referral_source" value={r} />
            ))}

            {step === "profile-name" ? (
              <>
                <section
                  aria-labelledby="step-name-heading"
                  className="my-auto space-y-6"
                >
                  <div className="space-y-1">
                    <h1
                      ref={stepHeadingRef}
                      id="step-name-heading"
                      tabIndex={-1}
                      className="font-serif text-2xl text-ink outline-none"
                    >
                      What do your friends call you?
                    </h1>
                    <p className="text-sm text-pencil">
                      Add a profile picture or pick an ink colour for the weekly handout.
                    </p>
                  </div>

                  <ProfilePhotoPicker
                    name={name}
                    color={color}
                    avatarUrl={avatarUrl}
                    onChangeAvatarUrl={setAvatarUrl}
                    fieldError={profileState?.fieldErrors?.avatar_url}
                  />

                  <div>
                    <label htmlFor="wizard_display_name" className="sr-only">
                      Your name
                    </label>
                    <input
                      id="wizard_display_name"
                      type="text"
                      autoComplete="name"
                      required
                      autoFocus
                      maxLength={40}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleContinueFromName();
                        }
                      }}
                      placeholder="Enter your first name or nickname"
                      aria-invalid={Boolean(
                        nameError ?? profileState?.fieldErrors?.display_name,
                      )}
                      className="w-full border-0 border-b-2 border-ink/40 bg-transparent px-1 py-3 text-xl font-semibold text-ink placeholder:font-normal placeholder:text-pencil/70 focus-visible:border-ink focus-visible:outline-none transition-colors"
                    />
                    <FormError
                      message={
                        nameError ?? profileState?.fieldErrors?.display_name
                      }
                    />
                  </div>

                  <fieldset className="space-y-2 pt-2">
                    <legend className="text-sm font-semibold text-pencil">
                      Pick your ink colour
                    </legend>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {AVATAR_COLORS.map((c) => {
                        const checked = color === c;
                        return (
                          <label
                            key={c}
                            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border-2 px-3 py-1.5 text-sm font-semibold capitalize transition-all duration-150 active:scale-95 ${
                              checked
                                ? "animate-chip-pop border-ink bg-paper text-ink"
                                : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                            }`}
                          >
                            <input
                              type="radio"
                              name="wizard_avatar_color"
                              value={c}
                              checked={checked}
                              onChange={() => {
                                triggerHaptic("selection");
                                setColor(c);
                              }}
                              className="sr-only"
                            />
                            <span className="flex items-center gap-2">
                              <Avatar
                                profile={{
                                  display_name: name || c,
                                  avatar_color: c,
                                }}
                                size="sm"
                              />
                              <span>{c}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <PhoneConsentField
                    phone={phone}
                    onChangePhone={setPhone}
                    fieldError={profileState?.fieldErrors?.phone}
                  />
                </section>

                <div className="flex items-center justify-between border-t border-rule/70 pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => goToStep("welcome-guide", "backward")}
                  >
                    Go back
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={handleContinueFromName}
                    >
                      Continue
                    </Button>
                    <StepNavPill
                      onBack={() => goToStep("welcome-guide", "backward")}
                      onForward={handleContinueFromName}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {step === "profile-study" ? (
              <>
                <section
                  aria-labelledby="step-study-heading"
                  className="my-auto space-y-6"
                >
                  <div className="space-y-1">
                    <h1
                      ref={stepHeadingRef}
                      id="step-study-heading"
                      tabIndex={-1}
                      className="font-serif text-2xl text-ink outline-none"
                    >
                      What are you curious about?
                    </h1>
                    <p className="text-base text-pencil">
                      Helps your group pick great first topics and homework length.
                    </p>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="font-semibold text-ink">
                      Topics you want to explore
                    </legend>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {TOPIC_OPTIONS.map((t) => {
                        const checked = topics.includes(t.value);
                        return (
                          <label
                            key={t.value}
                            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border-2 px-3.5 py-1.5 text-base font-semibold transition-all duration-150 active:scale-95 ${
                              checked
                                ? "animate-chip-pop border-ink bg-paper text-ink"
                                : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTopic(t.value)}
                              className="sr-only"
                            />
                            {checked ? (
                              <Check
                                aria-hidden
                                className="size-4 text-red stroke-[2.75]"
                              />
                            ) : null}
                            {t.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="font-semibold text-ink">
                      Weekly homework style
                    </legend>
                    <p className="text-sm text-pencil">
                      Pick as many as you like.
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                      {STUDY_PACE_OPTIONS.map((opt) => {
                        const checked = studyPaces.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border-2 px-3.5 py-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] ${
                              checked
                                ? "animate-chip-pop border-ink bg-paper text-ink"
                                : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="wizard_study_pace"
                              value={opt.value}
                              checked={checked}
                              onChange={() => toggleStudyPace(opt.value)}
                              className="sr-only"
                            />
                            <span>{opt.label}</span>
                            {checked ? (
                              <Check
                                aria-hidden
                                className="size-4 shrink-0 text-red stroke-[2.75]"
                              />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </section>

                <div className="flex items-center justify-between border-t border-rule/70 pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => goToStep("profile-name", "backward")}
                  >
                    Go back
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={() => goToStep("profile-schedule", "forward")}
                    >
                      Continue
                    </Button>
                    <StepNavPill
                      onBack={() => goToStep("profile-name", "backward")}
                      onForward={() => goToStep("profile-schedule", "forward")}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {step === "profile-schedule" ? (
              <>
                <section
                  aria-labelledby="step-schedule-heading"
                  className="my-auto space-y-6"
                >
                  <div className="space-y-1">
                    <h1
                      ref={stepHeadingRef}
                      id="step-schedule-heading"
                      tabIndex={-1}
                      className="font-serif text-2xl text-ink outline-none"
                    >
                      When are you usually free?
                    </h1>
                    <p className="text-base text-pencil">
                      Almost done—let your crew know when you can usually make it.
                    </p>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="font-semibold text-ink">
                      Best meetup times
                    </legend>
                    <p className="text-sm text-pencil">
                      Pick as many as you like.
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                      {AVAILABILITY_OPTIONS.map((opt) => {
                        const checked = availabilities.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md border-2 px-3.5 py-2 text-base font-semibold transition-all duration-150 active:scale-[0.98] ${
                              checked
                                ? "animate-chip-pop border-ink bg-paper text-ink"
                                : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="wizard_availability"
                              value={opt.value}
                              checked={checked}
                              onChange={() => toggleAvailability(opt.value)}
                              className="sr-only"
                            />
                            <span>{opt.label}</span>
                            {checked ? (
                              <Check
                                aria-hidden
                                className="size-4 shrink-0 text-red stroke-[2.75]"
                              />
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <Field
                    label="What do you study or do during the week?"
                    htmlFor="wizard_background"
                    optional
                    hint="School, major, or day job."
                    error={profileState?.fieldErrors?.background}
                  >
                    <input
                      id="wizard_background"
                      type="text"
                      maxLength={120}
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="e.g. History major, product designer, med student"
                      className={inputClass}
                    />
                  </Field>

                  <FormError message={profileState?.error} />
                </section>

                <div className="flex items-center justify-between border-t border-rule/70 pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={savingProfile}
                    onClick={() => goToStep("profile-study", "backward")}
                  >
                    Go back
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      haptic="success"
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving…" : "Save and continue"}
                    </Button>
                    <StepNavPill
                      onBack={() => goToStep("profile-study", "backward")}
                      disableBack={savingProfile}
                      disableForward={savingProfile}
                      submitForward
                    />
                  </div>
                </div>
              </>
            ) : null}
          </form>
        ) : null}

        {step === "group-start" ? (
          <section
            aria-labelledby="start-heading"
            className="flex flex-1 flex-col justify-between gap-6"
          >
            <div className="my-auto space-y-6">
              <div className="space-y-1.5">
                <h1
                  ref={stepHeadingRef}
                  id="start-heading"
                  tabIndex={-1}
                  className="font-serif text-2xl text-ink outline-none"
                >
                  Start a group
                </h1>
                <p className="text-base text-pencil">
                  You will be first in line to set week 1. Once the group is created, send the invite link to your friends.
                </p>
              </div>

              <CreateGroupForm />
            </div>

            <div className="flex items-center justify-between border-t border-rule/70 pt-5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => goToStep("group-join", "forward")}
              >
                Have an invite from a friend?
              </Button>
              <StepNavPill
                onBack={() => goToStep("profile-name", "backward")}
                backLabel="Go back to profile"
                onForward={() => goToStep("group-join", "forward")}
                forwardLabel="Join a friend's group"
              />
            </div>
          </section>
        ) : null}

        {step === "group-join" ? (
          <section
            aria-labelledby="join-heading"
            className="flex flex-1 flex-col justify-between gap-6"
          >
            <div className="my-auto space-y-6">
              <div className="space-y-1.5">
                <h1
                  ref={stepHeadingRef}
                  id="join-heading"
                  tabIndex={-1}
                  className="font-serif text-2xl text-ink outline-none"
                >
                  Have an invite from a friend?
                </h1>
                <p className="text-base text-pencil">
                  Enter the invite code your friend shared, or use your Phone app to fetch your number and find their group automatically.
                </p>
              </div>

              <JoinByCodeForm submitVariant="primary" submitSize="lg" />

              <div className="border-t border-rule/80 pt-5">
                <ContactGroupFinder
                  initialMatches={initialMatches}
                  initialContactsCount={initialContactsCount}
                  initialPhone={phone || profile?.phone || null}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-rule/70 pt-5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => goToStep("group-start", "backward")}
              >
                Go back to start a group
              </Button>
              <StepNavPill
                onBack={() => goToStep("group-start", "backward")}
                backLabel="Go back to start a group"
                disableForward
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
