"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { closeRound } from "@/app/actions/week";
import { Avatar, displayName } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";
import type { Member } from "@/lib/data";

export function CloseRoundForm({
  groupId,
  roundId,
  roundNumber,
  members,
  defaultAttendedIds,
  doneIds,
  nextHostName,
}: {
  groupId: string;
  roundId: string;
  roundNumber: number;
  members: readonly Member[];
  defaultAttendedIds: readonly string[];
  doneIds: readonly string[];
  nextHostName: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    closeRound,
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultAttendedIds),
  );
  const doneSet = new Set(doneIds);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="round_id" value={roundId} />

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold text-ink">
          Who came to the meetup?
        </legend>
        <p className="text-sm text-pencil">
          Tap each person who was there. Anyone who RSVPed &ldquo;Going&rdquo; is pre-selected.
        </p>

        <div className="divide-y divide-rule/80 border-y border-rule">
          {members.map((m) => {
            const checked = selected.has(m.user_id);
            const didHomework = doneSet.has(m.user_id);
            const name = displayName(m.profile);
            return (
              <label
                key={m.user_id}
                className="flex min-h-14 cursor-pointer items-center justify-between gap-3 py-3 select-none"
              >
                <input
                  type="checkbox"
                  name="attended"
                  value={m.user_id}
                  checked={checked}
                  onChange={() => toggle(m.user_id)}
                  className="sr-only"
                />
                <span className="flex items-center gap-3">
                  <Avatar
                    profile={m.profile}
                    size="md"
                    ring={didHomework}
                  />
                  <span>
                    <span
                      className={`block font-semibold text-ink ${
                        checked ? "highlighted px-1" : ""
                      }`}
                    >
                      {name}
                    </span>
                    <span className="block text-sm text-pencil">
                      {didHomework
                        ? "Did the homework"
                        : "Didn't check in"}
                    </span>
                  </span>
                </span>

                <span
                  aria-hidden
                  className={`inline-flex size-7 items-center justify-center rounded-md border-2 transition-colors ${
                    checked
                      ? "border-red bg-red text-paper"
                      : "border-slate-400 bg-paper text-transparent"
                  }`}
                >
                  <Check className="size-4 stroke-[3]" />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {nextHostName ? (
        <p className="text-base text-ink">
          Up next for week {roundNumber + 1}:{" "}
          <span className="highlighted px-1 font-semibold">{nextHostName}</span>
        </p>
      ) : null}

      <FormError message={state?.error} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Closing week…" : "Close the week"}
        </Button>
        <ButtonLink href={`/g/${groupId}`} variant="tertiary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
