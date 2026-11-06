"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { upgradeGroupToClubPass } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { triggerHaptic } from "@/lib/haptics";

export function ClubPassTrigger({
  groupId,
  groupName,
  isClubPass,
  triggerLabel = "Upgrade to Club Pass",
  variant = "secondary",
}: {
  groupId: string;
  groupName: string;
  isClubPass: boolean;
  triggerLabel?: string;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Fallback for browsers without native <dialog closedby="any"> support
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
      return () => dialog.removeEventListener("click", handleBackdropClick);
    }
  }, []);

  function openModal() {
    triggerHaptic("light");
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  function handleUpgrade() {
    setError(null);
    startTransition(async () => {
      const res = await upgradeGroupToClubPass(groupId);
      if (res?.error) {
        triggerHaptic("error");
        setError(res.error);
      } else {
        triggerHaptic("success");
        dialogRef.current?.close();
      }
    });
  }

  if (isClubPass) {
    return (
      <span className="highlighted inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-semibold text-ink">
        <Sparkles aria-hidden className="size-3.5" />
        <span>Club Pass Active</span>
      </span>
    );
  }

  return (
    <>
      <Button type="button" variant={variant} size="md" onClick={openModal}>
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        {...({ closedby: "any" } as Record<string, string>)}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-[30rem] rounded-md border border-rule bg-paper p-6 text-ink shadow-paper"
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red">
                Homiework Club Pass · One homie unlocks the whole crew
              </p>
              <h2 id={titleId} className="mt-1 font-serif text-2xl text-ink">
                Upgrade {groupName}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close dialog"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-pencil hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <p className="text-base text-pencil">
            One pass covers everyone in{" "}
            <span className="font-semibold text-ink">{groupName}</span>. Your
            pre-meetup study notes and post-meetup reflections are always free—Club
            Pass turns them into a collectible quarterly booklet and unlocks exams.
          </p>

          <ul className="space-y-3 border-y border-rule py-4 text-base text-ink">
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-red stroke-[3]" />
              <span>
                <span className="font-semibold">3-Month Semester Syllabus Zine PDF:</span>{" "}
                Compile every week&apos;s handout, study margin notes, post-meetup
                hot takes, and superlatives into a printable zine booklet.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-red stroke-[3]" />
              <span>
                <span className="font-semibold">Exam Your Friends (Pop Quizzes):</span>{" "}
                Hosts can attach 3–5 multiple-choice exam questions to any week and
                grade the crew with a red stamp and Club GPA.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-red stroke-[3]" />
              <span>
                <span className="font-semibold">All Mastery Syllabus Packs Included:</span>{" "}
                Unlock every multi-week mastery track (Urbanism, Philosophy of Mind,
                Energy Geopolitics, and Sociology of Taste).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-red stroke-[3]" />
              <span>
                <span className="font-semibold">Custom Stamps, Paper Themes & Full Archive:</span>{" "}
                Switch handout stationery (Blueprint, Manila, Blue-Book), set a custom
                rubber stamp motto, and keep unlimited past rounds.
              </span>
            </li>
          </ul>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-serif text-2xl text-ink">$5/month</span>
              <span className="ml-1.5 text-sm text-pencil">
                or $39/year for the whole group
              </span>
            </div>
            <span className="stamp rounded-md border border-red px-2 py-0.5 text-sm font-semibold text-red">
              Club Pass
            </span>
          </div>

          <FormError message={error ?? undefined} />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={pending}
              onClick={handleUpgrade}
              className="flex-1"
            >
              {pending ? "Unlocking Club Pass…" : "Unlock Club Pass for group"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={closeModal}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
