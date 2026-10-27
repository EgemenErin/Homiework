"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { publishTopic } from "@/app/actions/week";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { PassTurnButton } from "@/components/week-controls";
import type { ActionState } from "@/lib/actions";

export type ResourceDraft = {
  key: string;
  url: string;
  label: string;
  kind: "read" | "watch" | "listen" | "other";
  minutes: string;
};

export type TopIdea = {
  id: string;
  title: string;
  pitch: string | null;
  votes: number;
};

export function AssignForm({
  groupId,
  roundId,
  roundNumber,
  isEditing,
  timezone,
  defaultTitle,
  defaultWhy,
  defaultMeetupLocal,
  defaultPlace,
  defaultResources,
  topIdea,
  nextHostName,
  canPass,
}: {
  groupId: string;
  roundId: string;
  roundNumber: number;
  isEditing: boolean;
  timezone: string;
  defaultTitle: string;
  defaultWhy: string;
  defaultMeetupLocal: string;
  defaultPlace: string;
  defaultResources: ResourceDraft[];
  topIdea: TopIdea | null;
  nextHostName: string | null;
  canPass: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    publishTopic,
    null,
  );
  const [title, setTitle] = useState(defaultTitle);
  const [why, setWhy] = useState(defaultWhy);
  const [suggestionId, setSuggestionId] = useState("");
  const [rows, setRows] = useState<ResourceDraft[]>(
    defaultResources.length > 0
      ? defaultResources
      : [{ key: "r-0", url: "", label: "", kind: "read", minutes: "" }],
  );

  function applyTopIdea() {
    if (!topIdea) return;
    setTitle(topIdea.title);
    if (topIdea.pitch && !why.trim()) setWhy(topIdea.pitch);
    setSuggestionId(topIdea.id);
  }

  function addRow() {
    if (rows.length >= 10) return;
    setRows((prev) => [
      ...prev,
      {
        key: `r-${Date.now()}-${prev.length}`,
        url: "",
        label: "",
        kind: "read",
        minutes: "",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.key !== key),
    );
  }

  function updateRow(key: string, patch: Partial<ResourceDraft>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  return (
    <div className="space-y-8">
      {topIdea && !isEditing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-desk-deep px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-pencil">
              Top backlog idea ({topIdea.votes}{" "}
              {topIdea.votes === 1 ? "vote" : "votes"})
            </p>
            <p className="truncate font-semibold text-ink">{topIdea.title}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={applyTopIdea}
          >
            Use this idea
          </Button>
        </div>
      ) : null}

      <form action={action} className="space-y-8">
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="round_id" value={roundId} />
        <input type="hidden" name="timezone" value={timezone} />
        <input type="hidden" name="suggestion_id" value={suggestionId} />

        <Field
          label={`Week ${roundNumber} topic`}
          htmlFor="topic_title"
          hint="Phrase it as a question or a clear subject."
          error={state?.fieldErrors?.topic_title}
        >
          <input
            id="topic_title"
            name="topic_title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How does the Federal Reserve set interest rates?"
            aria-invalid={Boolean(state?.fieldErrors?.topic_title)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Why it matters"
          htmlFor="why"
          optional
          hint="One or two sentences on why we are studying this."
          error={state?.fieldErrors?.why}
        >
          <textarea
            id="why"
            name="why"
            rows={3}
            maxLength={600}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="We keep arguing about inflation and none of us knows how the rate gets decided."
            aria-invalid={Boolean(state?.fieldErrors?.why)}
            className={inputClass}
          />
        </Field>

        <fieldset className="space-y-4 border-t border-rule pt-6">
          <div className="flex items-baseline justify-between gap-2">
            <legend className="text-lg font-semibold text-ink">
              Homework links
            </legend>
            <span className="text-sm text-pencil">
              2 or 3 is the sweet spot
            </span>
          </div>

          <div className="space-y-6">
            {rows.map((row, idx) => (
              <div
                key={row.key}
                className="space-y-3 rounded-md border border-rule bg-desk-deep/60 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">
                    Link {idx + 1}
                  </span>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label={`Remove link ${idx + 1}`}
                      className="inline-flex min-h-11 items-center gap-1 px-2 text-sm text-pencil hover:text-red"
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Remove
                    </button>
                  ) : null}
                </div>

                <Field label="URL" htmlFor={`url-${row.key}`}>
                  <input
                    id={`url-${row.key}`}
                    name="resource_url"
                    type="url"
                    value={row.url}
                    onChange={(e) => updateRow(row.key, { url: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Title" htmlFor={`label-${row.key}`}>
                  <input
                    id={`label-${row.key}`}
                    name="resource_label"
                    type="text"
                    maxLength={120}
                    value={row.label}
                    onChange={(e) =>
                      updateRow(row.key, { label: e.target.value })
                    }
                    placeholder="What the FOMC is and how it votes"
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" htmlFor={`kind-${row.key}`}>
                    <select
                      id={`kind-${row.key}`}
                      name="resource_kind"
                      value={row.kind}
                      onChange={(e) =>
                        updateRow(row.key, {
                          kind: e.target.value as ResourceDraft["kind"],
                        })
                      }
                      className={inputClass}
                    >
                      <option value="read">Read</option>
                      <option value="watch">Watch</option>
                      <option value="listen">Listen</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Field
                    label="Minutes"
                    htmlFor={`minutes-${row.key}`}
                    optional
                  >
                    <input
                      id={`minutes-${row.key}`}
                      name="resource_minutes"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={999}
                      value={row.minutes}
                      onChange={(e) =>
                        updateRow(row.key, { minutes: e.target.value })
                      }
                      placeholder="12"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {state?.fieldErrors?.resources ? (
            <FormError message={state.fieldErrors.resources} />
          ) : null}

          {rows.length < 10 ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={addRow}
            >
              <Plus aria-hidden className="size-4" />
              Add another link
            </Button>
          ) : null}
        </fieldset>

        <fieldset className="space-y-4 border-t border-rule pt-6">
          <legend className="text-lg font-semibold text-ink">Meetup</legend>

          <Field
            label="Date and time"
            htmlFor="meetup_at"
            hint={`In ${timezone}`}
            error={state?.fieldErrors?.meetup_at}
          >
            <input
              id="meetup_at"
              name="meetup_at"
              type="datetime-local"
              required
              defaultValue={defaultMeetupLocal}
              aria-invalid={Boolean(state?.fieldErrors?.meetup_at)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Place"
            htmlFor="meetup_place"
            optional
            error={state?.fieldErrors?.meetup_place}
          >
            <input
              id="meetup_place"
              name="meetup_place"
              type="text"
              maxLength={80}
              defaultValue={defaultPlace}
              placeholder="e.g. Kerem's place or Café Kranzler"
              className={inputClass}
            />
          </Field>
        </fieldset>

        <FormError message={state?.error} />

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            {pending
              ? "Publishing…"
              : isEditing
                ? "Save changes"
                : "Publish topic"}
          </Button>
          <ButtonLink href={`/g/${groupId}`} variant="tertiary">
            Cancel
          </ButtonLink>
        </div>
      </form>

      {canPass && !isEditing ? (
        <div className="border-t border-rule pt-6">
          <p className="mb-2 text-sm text-pencil">
            Swamped this week? Pass your turn and you will go next week instead.
          </p>
          <PassTurnButton
            groupId={groupId}
            roundId={roundId}
            nextHostName={nextHostName}
          />
        </div>
      ) : null}
    </div>
  );
}
