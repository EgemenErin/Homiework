"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import { reorderRotation } from "@/app/actions/groups";
import { Avatar, displayName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import type { Member } from "@/lib/data";
import { triggerHaptic } from "@/lib/haptics";

export default function RotationEditor({
  groupId,
  initialMembers,
  onDone,
}: {
  groupId: string;
  initialMembers: readonly Member[];
  onDone: () => void;
}) {
  const [items, setItems] = useState(() => [...initialMembers]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    triggerHaptic("selection");
    setItems((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await reorderRotation(
        groupId,
        items.map((m) => m.user_id),
      );
      if (res?.error) {
        setError(res.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-pencil">
        Move homies up or down to change the weekly turn order.
      </p>

      <ol className="divide-y divide-rule/80 border-y border-rule">
        {items.map((m, idx) => {
          const name = displayName(m.profile);
          return (
            <li
              key={m.user_id}
              className="flex min-h-14 items-center justify-between gap-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-semibold text-pencil">
                  {idx + 1}.
                </span>
                <Avatar profile={m.profile} size="sm" />
                <span className="font-semibold text-ink">{name}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0 || isPending}
                  onClick={() => move(idx, -1)}
                  aria-label={`Move ${name} up`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-rule bg-paper text-ink disabled:opacity-40"
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1 || isPending}
                  onClick={() => move(idx, 1)}
                  aria-label={`Move ${name} down`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-rule bg-paper text-ink disabled:opacity-40"
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving order…" : "Save order"}
        </Button>
        <Button
          type="button"
          variant="tertiary"
          disabled={isPending}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
