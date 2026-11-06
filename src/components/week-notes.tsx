"use client";

import { BookOpen, Check, MessageSquareQuote, Printer } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveRoundNote } from "@/app/actions/week";
import { Avatar, displayName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { Member, RoundNote } from "@/lib/data";
import { triggerHaptic } from "@/lib/haptics";

export function WeekNotesSection({
  groupId,
  roundId,
  userId,
  members,
  notes,
  isClubPass,
}: {
  groupId: string;
  roundId: string;
  userId: string;
  members: readonly Member[];
  notes: readonly RoundNote[];
  isClubPass: boolean;
}) {
  const myNote = notes.find((n) => n.user_id === userId);
  const [preNote, setPreNote] = useState(myNote?.pre_study_note ?? "");
  const [postNote, setPostNote] = useState(myNote?.post_meetup_note ?? "");
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(members.map((m) => [m.user_id, m.profile]));
  const sharedNotes = notes.filter(
    (n) => n.pre_study_note.trim() || n.post_meetup_note.trim(),
  );

  function handleSave() {
    setError(null);
    setSavedToast(false);
    startTransition(async () => {
      const res = await saveRoundNote(roundId, preNote, postNote);
      if (res?.error) {
        triggerHaptic("error");
        setError(res.error);
      } else {
        triggerHaptic("success");
        setSavedToast(true);
      }
    });
  }

  return (
    <section
      aria-labelledby="study-notes-heading"
      className="space-y-6 border-t border-rule pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="study-notes-heading" className="text-lg font-semibold text-ink">
            Study notes &amp; meetup takeaways
          </h2>
          <p className="text-sm text-pencil">
            Jot down thoughts while doing the homework, then add quotes or hot takes after you meet up. Compiled into your quarterly Syllabus Zine.
          </p>
        </div>
        <Link
          href={`/g/${groupId}/zine`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
        >
          <Printer aria-hidden className="size-4 text-pencil" />
          <span>{isClubPass ? "Open Semester Zine PDF" : "Preview Semester Zine"}</span>
        </Link>
      </div>

      {/* Member's own pre-meetup & post-meetup note inputs */}
      <div className="space-y-4 rounded-md border border-rule bg-desk-deep/60 p-4">
        <Field
          label="While studying (pre-meetup margin note)"
          htmlFor={`pre-note-${roundId}`}
          optional
          hint="What surprised you in the reading/watching? Any question to bring to the table?"
        >
          <textarea
            id={`pre-note-${roundId}`}
            rows={2}
            maxLength={1000}
            value={preNote}
            onChange={(e) => {
              setPreNote(e.target.value);
              setSavedToast(false);
            }}
            placeholder="e.g. Wild that only 5 of the 12 regional Fed presidents vote at a time..."
            className={inputClass}
          />
        </Field>

        <Field
          label="After the meetup (post-meetup takeaway or quote)"
          htmlFor={`post-note-${roundId}`}
          optional
          hint="What did the group argue about? Any funny quote or final verdict?"
        >
          <textarea
            id={`post-note-${roundId}`}
            rows={2}
            maxLength={1000}
            value={postNote}
            onChange={(e) => {
              setPostNote(e.target.value);
              setSavedToast(false);
            }}
            placeholder="e.g. We drew a timeline on two café napkins and Mert defended gold for 40 minutes."
            className={inputClass}
          />
        </Field>

        <FormError message={error ?? undefined} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? "Saving notes…" : "Save my notes"}
          </Button>

          {savedToast ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Check aria-hidden className="size-4 text-red stroke-[3]" />
              <span>Saved to this week&apos;s zine log</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Group's shared notes feed */}
      {sharedNotes.length > 0 ? (
        <ul className="divide-y divide-rule/80 border-y border-rule">
          {sharedNotes.map((n) => {
            const profile = byId.get(n.user_id);
            const author = displayName(profile);
            return (
              <li key={n.user_id} className="space-y-2 py-4">
                <div className="flex items-center gap-2">
                  <Avatar
                    profile={
                      profile ?? { display_name: author, avatar_color: "ink" }
                    }
                    size="sm"
                  />
                  <span className="font-semibold text-ink">{author}</span>
                </div>

                {n.pre_study_note.trim() ? (
                  <div className="pl-10">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-pencil">
                      <BookOpen aria-hidden className="size-3.5" />
                      <span>Study margin note</span>
                    </p>
                    <p className="mt-0.5 text-base text-ink">{n.pre_study_note}</p>
                  </div>
                ) : null}

                {n.post_meetup_note.trim() ? (
                  <div className="pl-10">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-red">
                      <MessageSquareQuote aria-hidden className="size-3.5" />
                      <span>After the meetup</span>
                    </p>
                    <p className="mt-0.5 text-base text-ink">{n.post_meetup_note}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-pencil">
          No margin notes posted for this week yet. Be the first to drop a thought.
        </p>
      )}
    </section>
  );
}
