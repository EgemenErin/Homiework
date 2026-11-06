"use client";

import { Check, GraduationCap } from "lucide-react";
import { useState, useTransition } from "react";
import { submitRoundExam } from "@/app/actions/week";
import { ClubPassTrigger } from "@/components/club-pass-dialog";
import { Avatar, displayName } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import type {
  Member,
  RoundExamSubmission,
  RoundQuestion,
} from "@/lib/data";
import { triggerHaptic } from "@/lib/haptics";
import { letterGrade } from "@/lib/syllabus-packs";

export function WeekExamSection({
  groupId,
  groupName,
  roundId,
  userId,
  isClubPass,
  questions,
  submissions,
  members,
}: {
  groupId: string;
  groupName: string;
  roundId: string;
  userId: string;
  isClubPass: boolean;
  questions: readonly RoundQuestion[];
  submissions: readonly RoundExamSubmission[];
  members: readonly Member[];
}) {
  const mySubmission = submissions.find((s) => s.user_id === userId) ?? null;
  const [selected, setSelected] = useState<number[]>(() =>
    mySubmission?.answers?.length
      ? [...mySubmission.answers]
      : questions.map(() => -1),
  );
  const [retaking, setRetaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (questions.length === 0) {
    return null;
  }

  const byId = new Map(members.map((m) => [m.user_id, m.profile]));
  const showQuizForm = !mySubmission || retaking;

  function chooseOption(qIdx: number, optIdx: number) {
    triggerHaptic("selection");
    setSelected((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  function handleSubmit() {
    if (selected.some((ans) => ans < 0)) {
      setError("Answer every question before handing in your exam.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitRoundExam(roundId, selected);
      if (res.error) {
        triggerHaptic("error");
        setError(res.error);
      } else {
        triggerHaptic("success");
        setRetaking(false);
      }
    });
  }

  return (
    <section
      aria-labelledby="pop-quiz-heading"
      className="space-y-6 border-t border-rule pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap aria-hidden className="size-5 text-ink" />
          <h2 id="pop-quiz-heading" className="text-lg font-semibold text-ink">
            Weekly Pop Quiz ({questions.length}{" "}
            {questions.length === 1 ? "question" : "questions"})
          </h2>
        </div>

        {mySubmission ? (
          <div className="stamp inline-block rounded-md border-2 border-red bg-paper px-2.5 py-0.5 text-red">
            <span className="font-serif text-lg font-semibold">
              {letterGrade(mySubmission.score, mySubmission.total).grade}
            </span>{" "}
            <span className="text-sm font-semibold">
              ({mySubmission.score}/{mySubmission.total}) ·{" "}
              {letterGrade(mySubmission.score, mySubmission.total).remark}
            </span>
          </div>
        ) : null}
      </div>

      {!isClubPass ? (
        <div className="space-y-3 rounded-md border border-rule bg-desk-deep p-4">
          <p className="text-base font-semibold text-ink">
            This week has a {questions.length}-question Pop Quiz waiting for the crew.
          </p>
          <p className="text-sm text-pencil">
            Unlock <span className="font-semibold text-ink">Homiework Club Pass</span>{" "}
            so everyone in {groupName} can take weekly friend exams, get red-pen grade
            stamps, and track their Club GPA.
          </p>
          <ClubPassTrigger
            groupId={groupId}
            groupName={groupName}
            isClubPass={isClubPass}
            triggerLabel="Unlock Pop Quizzes with Club Pass"
            variant="primary"
          />
        </div>
      ) : showQuizForm ? (
        <div className="space-y-6 rounded-md border border-rule bg-paper p-5 shadow-paper">
          {questions.map((q, qIdx) => (
            <fieldset key={q.id} className="space-y-2.5">
              <legend className="text-base font-semibold text-ink">
                {qIdx + 1}. {q.prompt}
              </legend>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isPicked = selected[qIdx] === optIdx;
                  return (
                    <label
                      key={optIdx}
                      className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-base transition-colors select-none ${
                        isPicked
                          ? "border-ink bg-desk-deep font-semibold text-ink"
                          : "border-rule bg-paper text-ink hover:border-ink/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-q-${q.id}`}
                        checked={isPicked}
                        onChange={() => chooseOption(qIdx, optIdx)}
                        className="sr-only"
                      />
                      <span>{opt}</span>
                      {isPicked ? (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-red stroke-[3]"
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <FormError message={error ?? undefined} />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={pending}
              onClick={handleSubmit}
            >
              {pending ? "Grading exam…" : "Hand in Pop Quiz"}
            </Button>
            {mySubmission ? (
              <Button
                type="button"
                variant="tertiary"
                size="md"
                onClick={() => setRetaking(false)}
              >
                Cancel retake
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-md border border-rule bg-desk-deep/60 p-4">
            {questions.map((q, qIdx) => {
              const myAns = mySubmission.answers[qIdx];
              const isCorrect = myAns === q.correct_index;
              return (
                <div key={q.id} className="space-y-1 text-sm">
                  <p className="font-semibold text-ink">
                    {qIdx + 1}. {q.prompt}
                  </p>
                  <p className={isCorrect ? "text-ink" : "text-red"}>
                    Your answer: {q.options[myAns] ?? "—"}{" "}
                    {isCorrect
                      ? "✓"
                      : `✗ (Correct: ${q.options[q.correct_index]})`}
                  </p>
                </div>
              );
            })}
            <Button
              type="button"
              variant="tertiary"
              size="md"
              onClick={() => setRetaking(true)}
            >
              Retake quiz
            </Button>
          </div>
        </div>
      )}

      {/* Scoreboard of everyone who took the quiz */}
      {submissions.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-pencil">
            Exam grades ({submissions.length} handed in)
          </h3>
          <ul className="divide-y divide-rule/70 border-y border-rule">
            {submissions.map((sub) => {
              const profile = byId.get(sub.user_id);
              const name = displayName(profile);
              const { grade, remark } = letterGrade(sub.score, sub.total);
              return (
                <li
                  key={sub.user_id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      profile={
                        profile ?? { display_name: name, avatar_color: "ink" }
                      }
                      size="sm"
                    />
                    <span className="font-semibold text-ink">{name}</span>
                    <span className="text-sm text-pencil">{remark}</span>
                  </div>
                  <span className="highlighted px-1.5 font-serif text-base font-semibold text-red">
                    {grade} ({sub.score}/{sub.total})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
