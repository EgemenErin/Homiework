"use client";

import { ChevronUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useOptimistic, useRef, useState, useTransition } from "react";
import {
  addSuggestion,
  deleteSuggestion,
  setVote,
} from "@/app/actions/backlog";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";

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
        label="Suggest a topic"
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
    setError(null);
    startTransition(async () => {
      setOptimistic({ votes: nextVotes, voted: nextVoted });
      const res = await setVote(id, nextVoted);
      if (res?.error) setError(res.error);
    });
  }

  function handleDelete() {
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
          className={`inline-flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-md border-2 px-2 py-1 text-sm font-semibold transition-colors ${
            optimistic.voted
              ? "border-ink bg-highlight text-ink"
              : "border-slate-300 bg-paper text-pencil hover:border-ink hover:text-ink"
          }`}
        >
          <ChevronUp aria-hidden className="size-4 stroke-[2.5]" />
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
