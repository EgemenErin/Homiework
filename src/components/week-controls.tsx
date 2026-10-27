"use client";

import { useOptimistic, useState, useTransition } from "react";
import { passTurn, setCheckin, setRsvp } from "@/app/actions/week";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";

export function CheckinButton({
  roundId,
  initialDone,
}: {
  roundId: string;
  initialDone: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(initialDone);
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !optimisticDone;
    setError(null);
    startTransition(async () => {
      setOptimisticDone(next);
      const res = await setCheckin(roundId, next);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      {optimisticDone ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink bg-highlight-soft px-4 py-3">
          <div className="flex items-center gap-2.5">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-6 shrink-0 text-red"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M4 12.5l5.5 5.5L20 6.5"
                strokeDasharray="24"
                className="animate-[var(--animate-tick)]"
              />
            </svg>
            <span className="font-semibold text-ink">You did this week&apos;s homework.</span>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggle}
            className="min-h-11 px-2 text-sm font-semibold text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
          >
            Undo
          </button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          disabled={isPending}
          onClick={handleToggle}
          className="w-full"
        >
          I did the homework
        </Button>
      )}
      <FormError message={error} />
    </div>
  );
}

const RSVP_OPTIONS: { value: "going" | "maybe" | "out"; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "out", label: "Can't" },
];

export function RsvpControl({
  roundId,
  initialStatus,
  counts,
}: {
  roundId: string;
  initialStatus: "going" | "maybe" | "out" | null;
  counts: { going: number; maybe: number; out: number };
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(initialStatus);
  const [error, setError] = useState<string | null>(null);

  function choose(next: "going" | "maybe" | "out") {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await setRsvp(roundId, next);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Your RSVP for the meetup"
        className="inline-grid grid-cols-3 rounded-md border-2 border-ink/80 bg-desk-deep p-0.5"
      >
        {RSVP_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              disabled={isPending}
              onClick={() => choose(opt.value)}
              className={`min-h-11 min-w-22 rounded-[4px] px-4 text-base font-semibold transition-colors ${
                active
                  ? "bg-paper text-ink shadow-xs"
                  : "text-pencil hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-pencil">
        {counts.going} going
        {counts.maybe > 0 ? `, ${counts.maybe} maybe` : ""}
        {counts.out > 0 ? `, ${counts.out} can't make it` : ""}
      </p>
      <FormError message={error} />
    </div>
  );
}

export function PassTurnButton({
  groupId,
  roundId,
  nextHostName,
}: {
  groupId: string;
  roundId: string;
  nextHostName: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePass() {
    setError(null);
    startTransition(async () => {
      const res = await passTurn(groupId, roundId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-1">
      <Button
        variant="tertiary"
        disabled={isPending}
        onClick={handlePass}
      >
        {isPending
          ? "Passing turn…"
          : nextHostName
            ? `Pass my turn to ${nextHostName}`
            : "Pass my turn"}
      </Button>
      <FormError message={error} />
    </div>
  );
}
