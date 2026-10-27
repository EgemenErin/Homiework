"use client";

import { useActionState, useState } from "react";
import { createGroup, joinGroup } from "@/app/actions/groups";
import { saveProfile } from "@/app/actions/profile";
import { AVATAR_COLORS, Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { ActionState } from "@/lib/actions";
import type { Profile } from "@/lib/data";
import { WEEKDAYS } from "@/lib/dates";

export function ProfileStepForm({
  profile,
  nextPath,
  submitLabel = "Save name",
}: {
  profile: Profile | null;
  nextPath?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveProfile,
    null,
  );
  const [name, setName] = useState(profile?.display_name ?? "");
  const [color, setColor] = useState<Profile["avatar_color"]>(
    profile?.avatar_color ?? "ink",
  );

  return (
    <form action={action} className="space-y-6">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      <div className="flex items-center gap-4">
        <Avatar
          profile={{ display_name: name || "You", avatar_color: color }}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <Field
            label="What do your friends call you?"
            htmlFor="display_name"
            error={state?.fieldErrors?.display_name}
          >
            <input
              id="display_name"
              name="display_name"
              type="text"
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
      </div>

      <fieldset className="space-y-2">
        <legend className="font-semibold text-ink">Pick your ink colour</legend>
        <div className="flex flex-wrap gap-3 pt-1">
          {AVATAR_COLORS.map((c) => {
            const checked = color === c;
            return (
              <label
                key={c}
                className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border-2 px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  checked
                    ? "border-ink bg-paper text-ink"
                    : "border-transparent bg-desk-deep text-pencil hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="avatar_color"
                  value={c}
                  checked={checked}
                  onChange={() => setColor(c)}
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

      <FormError message={state?.error} />
      {state?.ok ? (
        <p role="status" className="text-sm font-semibold text-ink">
          Saved.
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
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
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Creating group…" : "Start a group"}
        </Button>
      </div>
    </form>
  );
}

export function JoinByCodeForm() {
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
          required
          placeholder="homies2026"
          aria-invalid={Boolean(state?.fieldErrors?.code)}
          className={inputClass}
        />
      </Field>

      <FormError message={state?.error} />

      <div>
        <Button type="submit" variant="secondary" size="md" disabled={pending}>
          {pending ? "Joining…" : "Join with invite"}
        </Button>
      </div>
    </form>
  );
}
