"use client";

import { BookOpen, Check, ChevronDown, ChevronUp, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addSuggestion,
  deleteSuggestion,
  setVote,
} from "@/app/actions/backlog";
import { activateSyllabusPack } from "@/app/actions/groups";
import { ClubPassTrigger } from "@/components/club-pass-dialog";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";
import { triggerHaptic } from "@/lib/haptics";
import {
  isPackUnlockedForGroup,
  SYLLABUS_PACKS,
  type SyllabusPack,
} from "@/lib/syllabus-packs";

export function SyllabusPacksSection({
  groupId,
  groupName,
  planTier,
  activePackId,
  activePackWeek,
  unlockedPacks,
  canPickForThisWeek,
}: {
  groupId: string;
  groupName: string;
  planTier: "free" | "club_pass";
  activePackId: string | null;
  activePackWeek: number;
  unlockedPacks: readonly string[];
  canPickForThisWeek: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    activePackId ?? SYLLABUS_PACKS[0]?.id ?? null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleActivate(pack: SyllabusPack, weekNum = 1) {
    setError(null);
    triggerHaptic("success");
    startTransition(async () => {
      const res = await activateSyllabusPack(groupId, pack.id, weekNum);
      if (res?.error) setError(res.error);
    });
  }

  function handleClearPack() {
    setError(null);
    triggerHaptic("light");
    startTransition(async () => {
      const res = await activateSyllabusPack(groupId, null, 1);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <section
      aria-labelledby="syllabus-packs-heading"
      className="space-y-4 border-b border-rule pb-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            id="syllabus-packs-heading"
            className="font-serif text-2xl text-ink"
          >
            Mastery Syllabus Packs
          </h2>
          <p className="mt-1 text-base text-pencil">
            Lock in on one big subject for 1 to 2 months and master it together—complete with curated links and weekly Pop Quizzes.
          </p>
        </div>
        {planTier !== "club_pass" ? (
          <ClubPassTrigger
            groupId={groupId}
            groupName={groupName}
            isClubPass={false}
            triggerLabel="Unlock All Packs with Club Pass"
            variant="secondary"
          />
        ) : null}
      </div>

      <FormError message={error ?? undefined} />

      <div className="space-y-3">
        {SYLLABUS_PACKS.map((pack) => {
          const isActive = activePackId === pack.id;
          const isUnlocked = isPackUnlockedForGroup(pack, {
            plan_tier: planTier,
            unlocked_packs: [...unlockedPacks],
          });
          const isOpen = expandedId === pack.id;
          const currentWeek = isActive
            ? Math.min(Math.max(1, activePackWeek || 1), pack.weeksCount)
            : 1;

          return (
            <div
              key={pack.id}
              className={`rounded-md border transition-colors ${
                isActive
                  ? "border-ink bg-paper shadow-paper"
                  : "border-rule bg-desk-deep/60"
              }`}
            >
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-pencil">
                        {pack.subject}
                      </span>
                      <span className="text-pencil">·</span>
                      <span className="font-semibold text-ink">
                        {pack.estimatedMonths}
                      </span>
                      {pack.tier === "free" ? (
                        <span className="rounded-sm border border-ink/40 bg-paper px-1.5 py-0.5 text-xs font-semibold text-ink">
                          Free Pack
                        </span>
                      ) : isUnlocked ? (
                        <span className="highlighted px-1.5 text-xs font-semibold text-ink">
                          Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-red/50 bg-red-wash px-1.5 py-0.5 text-xs font-semibold text-red">
                          <Lock aria-hidden className="size-3" />
                          <span>{pack.priceLabel}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-xl text-ink">
                      {pack.title}
                    </h3>
                    <p className="max-w-[60ch] text-sm text-pencil">
                      {pack.tagline}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isOpen ? null : pack.id)
                    }
                    className="inline-flex min-h-10 items-center gap-1 rounded-md border border-rule bg-paper px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink"
                  >
                    <BookOpen aria-hidden className="size-4 text-pencil" />
                    <span>{isOpen ? "Hide weeks" : `View ${pack.weeksCount} weeks`}</span>
                    {isOpen ? (
                      <ChevronUp aria-hidden className="size-4" />
                    ) : (
                      <ChevronDown aria-hidden className="size-4" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule/70 pt-3">
                  {isActive ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="highlighted inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-semibold text-ink">
                        <Check aria-hidden className="size-4 text-red stroke-[3]" />
                        <span>
                          Active Mastery Track · Week {currentWeek} of {pack.weeksCount}
                        </span>
                      </span>
                      {canPickForThisWeek ? (
                        <Link
                          href={`/g/${groupId}/assign?pack=${pack.id}&week=${currentWeek}`}
                          className="inline-flex min-h-9 items-center rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink-soft"
                        >
                          Load Week {currentWeek} into handout
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={handleClearPack}
                        className="text-sm text-pencil underline hover:text-ink"
                      >
                        Pause track
                      </button>
                    </div>
                  ) : isUnlocked ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={pending}
                        onClick={() => handleActivate(pack, 1)}
                      >
                        Start {pack.weeksCount}-Week Mastery Track
                      </Button>
                      {canPickForThisWeek ? (
                        <Link
                          href={`/g/${groupId}/assign?pack=${pack.id}&week=1`}
                          className="text-sm font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
                        >
                          Use Week 1 for this week
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={pending}
                        onClick={() => handleActivate(pack, 1)}
                      >
                        Unlock Pack ($7) &amp; Start Track
                      </Button>
                      <span className="text-sm text-pencil">
                        or free with Club Pass
                      </span>
                    </div>
                  )}
                </div>

                {isOpen ? (
                  <ol className="mt-4 divide-y divide-rule/70 border-t border-rule pt-3">
                    {pack.weeks.map((w) => (
                      <li
                        key={w.weekNumber}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink">
                            Week {w.weekNumber}: {w.topic_title}
                          </p>
                          <p className="text-pencil">
                            {w.resources.length}{" "}
                            {w.resources.length === 1 ? "link" : "links"} ·{" "}
                            {w.exam_questions.length} Pop Quiz{" "}
                            {w.exam_questions.length === 1
                              ? "question"
                              : "questions"}
                          </p>
                        </div>
                        {canPickForThisWeek && isUnlocked ? (
                          <Link
                            href={`/g/${groupId}/assign?pack=${pack.id}&week=${w.weekNumber}`}
                            className="shrink-0 font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
                          >
                            Assign Week {w.weekNumber}
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AddSuggestionForm({ groupId }: { groupId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await addSuggestion(prev, fd);
      if (res?.ok) formRef.current?.reset();
      return res;
    },
    null,
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 border-b border-rule pb-8"
    >
      <input type="hidden" name="group_id" value={groupId} />

      <Field
        label="Suggest a standalone topic"
        htmlFor="suggestion-title"
        error={state?.fieldErrors?.title}
      >
        <input
          id="suggestion-title"
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. How do vaccines train the immune system?"
          aria-invalid={Boolean(state?.fieldErrors?.title)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Why should we study it?"
        htmlFor="suggestion-pitch"
        optional
        error={state?.fieldErrors?.pitch}
      >
        <input
          id="suggestion-pitch"
          name="pitch"
          type="text"
          maxLength={600}
          placeholder="One sentence on why it's worth a week."
          className={inputClass}
        />
      </Field>

      <FormError message={state?.error} />

      <div>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Adding…" : "Add to backlog"}
        </Button>
      </div>
    </form>
  );
}

export function SuggestionRow({
  id,
  groupId,
  title,
  pitch,
  authorName,
  initialVotes,
  initialVoted,
  isMine,
  canPickForThisWeek,
}: {
  id: string;
  groupId: string;
  title: string;
  pitch: string | null;
  authorName: string;
  initialVotes: number;
  initialVoted: boolean;
  isMine: boolean;
  canPickForThisWeek: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { votes: initialVotes, voted: initialVoted },
    (_cur, next: { votes: number; voted: boolean }) => next,
  );
  const [error, setError] = useState<string | null>(null);

  function handleVote() {
    const nextVoted = !optimistic.voted;
    const nextVotes = optimistic.votes + (nextVoted ? 1 : -1);
    triggerHaptic(nextVoted ? "selection" : "light");
    setError(null);
    startTransition(async () => {
      setOptimistic({ votes: nextVotes, voted: nextVoted });
      const res = await setVote(id, nextVoted);
      if (res?.error) setError(res.error);
    });
  }

  function handleDelete() {
    triggerHaptic("warning");
    setError(null);
    startTransition(async () => {
      const res = await deleteSuggestion(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li className="py-4">
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={handleVote}
          disabled={isPending}
          aria-pressed={optimistic.voted}
          aria-label={`Upvote "${title}" (${optimistic.votes} ${optimistic.votes === 1 ? "vote" : "votes"})`}
          className={`inline-flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-md border-2 px-2 py-1 text-sm font-semibold transition-all duration-150 active:scale-95 ${
            optimistic.voted
              ? "animate-chip-pop border-ink bg-highlight text-ink"
              : "border-slate-300 bg-paper text-pencil hover:border-ink hover:text-ink"
          }`}
        >
          <ChevronUp
            aria-hidden
            className={`size-4 stroke-[2.5] transition-transform duration-150 ${
              optimistic.voted ? "-translate-y-0.5" : ""
            }`}
          />
          <span>{optimistic.votes}</span>
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {pitch ? (
            <p className="max-w-[58ch] text-base text-pencil">{pitch}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-sm text-pencil">
            <span>Suggested by {authorName}</span>

            {canPickForThisWeek ? (
              <Link
                href={`/g/${groupId}/assign?idea=${id}`}
                className="inline-flex min-h-9 items-center font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
              >
                Pick for this week
              </Link>
            ) : null}

            {isMine ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex min-h-9 items-center gap-1 text-pencil hover:text-red"
              >
                <Trash2 aria-hidden className="size-3.5" />
                Remove
              </button>
            ) : null}
          </div>

          <FormError message={error} />
        </div>
      </div>
    </li>
  );
}
