"use client";

import {
  Calendar,
  Check,
  Coffee,
  Copy,
  GraduationCap,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Stamp,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import {
  addPotEntry,
  regenerateInvite,
  saveCampusSettings,
  saveClubStyle,
  saveDiscordWebhook,
  savePotSettings,
  sendDiscordTest,
  togglePotSettled,
} from "@/app/actions/groups";
import { ClubPassTrigger } from "@/components/club-pass-dialog";
import { displayName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { Group, Member, PotEntry } from "@/lib/data";
import { triggerHaptic } from "@/lib/haptics";

const RotationEditor = dynamic(() => import("./rotation-editor"), {
  loading: () => (
    <p className="text-sm text-pencil">Loading rotation editor…</p>
  ),
});

export function InviteBox({
  groupId,
  groupName,
  inviteCode,
  isOwner,
}: {
  groupId: string;
  groupName: string;
  inviteCode: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function getUrl() {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}/join/${inviteCode}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select and copy the link below.");
    }
  }

  async function handleShare() {
    const url = getUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Homiework`,
          text: `Join ${groupName} on Homiework so we can rotate weekly study topics:`,
          url,
        });
        return;
      } catch {
        // User cancelled share sheet
      }
    }
    await handleCopy();
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateInvite(groupId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rule bg-desk-deep px-3.5 py-2.5">
        <code className="truncate text-sm text-ink">/join/{inviteCode}</code>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check aria-hidden className="size-4 text-red" />
                Copied
              </>
            ) : (
              <>
                <Copy aria-hidden className="size-4" />
                Copy link
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleShare}
          >
            <Share2 aria-hidden className="size-4" />
            Invite
          </Button>
        </div>
      </div>

      {isOwner ? (
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReset}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            {isPending ? "Resetting invite link…" : "Reset invite link"}
          </button>
        </div>
      ) : null}

      <FormError message={error} />
    </div>
  );
}

export function RotationReorderTrigger({
  groupId,
  members,
}: {
  groupId: string;
  members: readonly Member[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="pt-2">
        <RotationEditor
          groupId={groupId}
          initialMembers={members}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="tertiary"
      onClick={() => setEditing(true)}
    >
      Change rotation order
    </Button>
  );
}

export function CalendarAndDiscordSection({
  groupId,
  initialWebhookUrl,
}: {
  groupId: string;
  initialWebhookUrl: string | null;
}) {
  const [webhook, setWebhook] = useState(initialWebhookUrl ?? "");
  const [calCopied, setCalCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const icsPath = `/api/g/${groupId}/calendar.ics`;

  async function copyCalUrl() {
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";
      await navigator.clipboard.writeText(`${origin}${icsPath}`);
      setCalCopied(true);
      setTimeout(() => setCalCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleSaveWebhook() {
    setError(null);
    setStatusMsg(null);
    startTransition(async () => {
      const res = await saveDiscordWebhook(groupId, webhook);
      if (res?.error) {
        triggerHaptic("error");
        setError(res.error);
      } else {
        triggerHaptic("success");
        setStatusMsg("Discord webhook saved.");
      }
    });
  }

  function handleTestDiscord() {
    setError(null);
    setStatusMsg(null);
    startTransition(async () => {
      const res = await sendDiscordTest(groupId, webhook);
      if (res?.error) {
        triggerHaptic("error");
        setError(res.error);
      } else {
        triggerHaptic("success");
        setStatusMsg("Sent a test embed to your Discord channel!");
      }
    });
  }

  return (
    <section
      aria-labelledby="integrations-heading"
      className="space-y-4 border-t border-rule pt-8"
    >
      <div>
        <h2
          id="integrations-heading"
          className="text-lg font-semibold text-ink"
        >
          Calendar &amp; Discord integration
        </h2>
        <p className="text-sm text-pencil">
          Keep meetups on everyone&apos;s calendar and automatically post weekly topics to your Discord server.
        </p>
      </div>

      {/* Calendar Feed */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-desk-deep/60 p-3.5">
        <div className="flex items-center gap-2.5">
          <Calendar aria-hidden className="size-4 shrink-0 text-pencil" />
          <div className="text-sm">
            <p className="font-semibold text-ink">Group Calendar (.ics feed)</p>
            <p className="text-pencil">
              Works with Apple Calendar, Google Calendar, and Outlook.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={copyCalUrl}
          >
            {calCopied ? "Feed URL copied" : "Copy feed URL"}
          </Button>
          <a
            href={icsPath}
            download
            className="inline-flex min-h-11 items-center rounded-md border border-rule bg-paper px-3 py-2 text-sm font-semibold text-ink hover:border-ink"
          >
            Download .ics
          </a>
        </div>
      </div>

      {/* Discord Webhook */}
      <div className="space-y-3 rounded-md border border-rule bg-desk-deep/60 p-4">
        <Field
          label="Discord channel webhook URL"
          htmlFor={`discord-webhook-${groupId}`}
          optional
          hint="In Discord: Server Settings → Integrations → Webhooks → Copy Webhook URL."
        >
          <input
            id={`discord-webhook-${groupId}`}
            type="url"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className={inputClass}
          />
        </Field>

        <FormError message={error ?? undefined} />
        {statusMsg ? (
          <p className="text-sm font-semibold text-ink">{statusMsg}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={handleSaveWebhook}
          >
            {pending ? "Saving…" : "Save Discord webhook"}
          </Button>
          {webhook.trim() ? (
            <Button
              type="button"
              variant="tertiary"
              size="md"
              disabled={pending}
              onClick={handleTestDiscord}
            >
              <Send aria-hidden className="size-3.5" />
              <span>Send test ping</span>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function MeetupPotSection({
  groupId,
  potEnabled,
  potStakeText,
  potEntries,
  members,
}: {
  groupId: string;
  potEnabled: boolean;
  potStakeText: string;
  potEntries: readonly PotEntry[];
  members: readonly Member[];
}) {
  const [enabled, setEnabled] = useState(Boolean(potEnabled));
  const [stake, setStake] = useState(
    potStakeText ?? "$3 to the Thursday Coffee/Beer Pot",
  );
  const [selectedUser, setSelectedUser] = useState(members[0]?.user_id ?? "");
  const [reason, setReason] = useState("Skipped homework before meetup");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(members.map((m) => [m.user_id, m.profile]));
  const unsettledCount = potEntries.filter((e) => !e.settled).length;

  function handleSaveSettings(nextEnabled: boolean) {
    setEnabled(nextEnabled);
    setError(null);
    startTransition(async () => {
      const res = await savePotSettings(groupId, nextEnabled, stake);
      if (res?.error) setError(res.error);
    });
  }

  function handleAddIou() {
    if (!selectedUser) return;
    setError(null);
    triggerHaptic("light");
    startTransition(async () => {
      const res = await addPotEntry(groupId, selectedUser, reason);
      if (res?.error) setError(res.error);
    });
  }

  function handleToggleSettled(entryId: string, settled: boolean) {
    triggerHaptic("selection");
    startTransition(async () => {
      await togglePotSettled(entryId, settled);
    });
  }

  return (
    <section
      id="meetup-pot"
      aria-labelledby="pot-heading"
      className="space-y-4 border-t border-rule pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            id="pot-heading"
            className="flex items-center gap-2 text-lg font-semibold text-ink"
          >
            <Coffee aria-hidden className="size-5 text-pencil" />
            <span>Meetup Homework Jar (Optional)</span>
          </h2>
          <p className="text-sm text-pencil">
            Honor-system pot between friends—no banks or cards. If you show up without doing the homework, you owe the pot at the next meetup.
          </p>
        </div>

        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleSaveSettings(e.target.checked)}
            className="size-4 accent-ink"
          />
          <span>Enable Homework Jar</span>
        </label>
      </div>

      {enabled ? (
        <div className="space-y-4 rounded-md border border-rule bg-desk-deep/60 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <Field
                label="What is the stake per missed homework?"
                htmlFor={`pot-stake-${groupId}`}
              >
                <input
                  id={`pot-stake-${groupId}`}
                  type="text"
                  maxLength={80}
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="$3 to the Thursday Coffee/Beer Pot"
                  className={inputClass}
                />
              </Field>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={pending}
              onClick={() => handleSaveSettings(true)}
            >
              Save stake
            </Button>
          </div>

          {/* Active & Settled IOUs */}
          <div className="space-y-2 border-t border-rule pt-3">
            <p className="text-sm font-semibold text-ink">
              Current Jar Tally ({unsettledCount} unpaid)
            </p>
            {potEntries.length === 0 ? (
              <p className="text-sm text-pencil">
                Nobody owes the jar right now. Everyone did their homework!
              </p>
            ) : (
              <ul className="divide-y divide-rule/70">
                {potEntries.map((entry) => {
                  const name = displayName(byId.get(entry.user_id));
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <div className={entry.settled ? "line-through text-pencil" : "text-ink"}>
                        <span className="font-semibold">{name}</span> ·{" "}
                        <span>{entry.reason}</span>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          handleToggleSettled(entry.id, !entry.settled)
                        }
                        className="rounded-md border border-rule bg-paper px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink"
                      >
                        {entry.settled ? "Settled ✓ (Undo)" : "Mark settled at meetup"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Add manual IOU */}
          <div className="flex flex-wrap items-end gap-2 border-t border-rule pt-3">
            <select
              aria-label="Member who owes the pot"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="min-h-11 rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {displayName(m.profile)}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label="Reason for IOU"
              maxLength={120}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-11 flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={pending}
              onClick={handleAddIou}
            >
              Add to jar
            </Button>
          </div>

          <FormError message={error ?? undefined} />
        </div>
      ) : null}
    </section>
  );
}

export function ClubStyleSection({
  groupId,
  groupName,
  isClubPass,
  initialPaperTheme,
  initialStampStyle,
  initialStampMotto,
}: {
  groupId: string;
  groupName: string;
  isClubPass: boolean;
  initialPaperTheme: Group["paper_theme"];
  initialStampStyle: Group["stamp_style"];
  initialStampMotto: string;
}) {
  const [paperTheme, setPaperTheme] =
    useState<Group["paper_theme"]>(initialPaperTheme ?? "classic");
  const [stampStyle, setStampStyle] =
    useState<Group["stamp_style"]>(initialStampStyle ?? "classic_due");
  const [motto, setMotto] = useState(initialStampMotto ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const res = await saveClubStyle(groupId, paperTheme, stampStyle, motto);
      if (res?.ok) {
        triggerHaptic("success");
        setSaved(true);
      }
    });
  }

  return (
    <section
      aria-labelledby="club-style-heading"
      className="space-y-4 border-t border-rule pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            id="club-style-heading"
            className="flex items-center gap-2 text-lg font-semibold text-ink"
          >
            <Stamp aria-hidden className="size-5 text-red" />
            <span>Custom Club Stamp &amp; Paper Theme</span>
          </h2>
          <p className="text-sm text-pencil">
            Customize your weekly assignment handout stationery and rubber stamp.
          </p>
        </div>

        <ClubPassTrigger
          groupId={groupId}
          groupName={groupName}
          isClubPass={isClubPass}
          triggerLabel="Unlock with Club Pass"
          variant="secondary"
        />
      </div>

      <div className="space-y-4 rounded-md border border-rule bg-desk-deep/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Handout paper theme" htmlFor={`paper-theme-${groupId}`}>
            <select
              id={`paper-theme-${groupId}`}
              disabled={!isClubPass}
              value={paperTheme}
              onChange={(e) =>
                setPaperTheme(e.target.value as Group["paper_theme"])
              }
              className={inputClass}
            >
              <option value="classic">Classic Cream Ruled</option>
              <option value="blueprint">Engineer Blueprint Grid</option>
              <option value="manila">Archival Manila Dossier</option>
              <option value="exam_blue">University Blue Exam Book</option>
            </select>
          </Field>

          <Field label="Rubber stamp style" htmlFor={`stamp-style-${groupId}`}>
            <select
              id={`stamp-style-${groupId}`}
              disabled={!isClubPass}
              value={stampStyle}
              onChange={(e) =>
                setStampStyle(e.target.value as Group["stamp_style"])
              }
              className={inputClass}
            >
              <option value="classic_due">Classic Red Grading Stamp</option>
              <option value="library_dater">Library Date Due Stamp</option>
              <option value="wax_seal">Club Wax Seal</option>
              <option value="classified">Eyes Only · Classified</option>
              <option value="dept_approved">Department Approved</option>
            </select>
          </Field>
        </div>

        <Field
          label="Custom stamp motto"
          htmlFor={`stamp-motto-${groupId}`}
          optional
          hint="Printed across the top of your group's due stamp and Semester Zine."
        >
          <input
            id={`stamp-motto-${groupId}`}
            type="text"
            disabled={!isClubPass}
            maxLength={32}
            value={motto}
            onChange={(e) => setMotto(e.target.value)}
            placeholder="e.g. DEPT. OF LATE NIGHTS"
            className={inputClass}
          />
        </Field>

        {isClubPass ? (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? "Saving style…" : "Save club stationery"}
            </Button>
            {saved ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
                <Sparkles aria-hidden className="size-4 text-red" />
                <span>Applied to handout</span>
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-pencil">
            Upgrade to <span className="font-semibold text-ink">Club Pass</span>{" "}
            to apply custom paper themes and rubber stamps to {groupName}.
          </p>
        )}
      </div>
    </section>
  );
}

export function CampusCircleSection({
  groupId,
  initialUniversity,
  initialPublic,
}: {
  groupId: string;
  initialUniversity: string | null;
  initialPublic: boolean;
}) {
  const [uni, setUni] = useState(initialUniversity ?? "");
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const res = await saveCampusSettings(groupId, uni, isPublic);
      if (res?.ok) {
        triggerHaptic("success");
        setSaved(true);
      }
    });
  }

  return (
    <section
      aria-labelledby="campus-heading"
      className="space-y-4 border-t border-rule pt-8"
    >
      <div>
        <h2
          id="campus-heading"
          className="flex items-center gap-2 text-lg font-semibold text-ink"
        >
          <GraduationCap aria-hidden className="size-5 text-pencil" />
          <span>University Circle (Free Campus Directory)</span>
        </h2>
        <p className="text-sm text-pencil">
          Tag your university or school so fellow students can discover and join your study circle.
        </p>
      </div>

      <div className="space-y-4 rounded-md border border-rule bg-desk-deep/60 p-4">
        <Field
          label="University or campus name"
          htmlFor={`uni-name-${groupId}`}
          optional
        >
          <input
            id={`uni-name-${groupId}`}
            type="text"
            maxLength={80}
            value={uni}
            onChange={(e) => setUni(e.target.value)}
            placeholder="e.g. TU Berlin, Columbia University, Boğaziçi University"
            className={inputClass}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="size-4 accent-ink"
          />
          <span>
            List this group in the public University Clubs directory so students can join
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Save campus settings"}
          </Button>
          {saved ? (
            <span className="text-sm font-semibold text-ink">Saved ✓</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
