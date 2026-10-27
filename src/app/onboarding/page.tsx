import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleHeader } from "@/components/group-nav";
import { getMyGroups, getMyProfile, requireUser } from "@/lib/data";
import {
  CreateGroupForm,
  JoinByCodeForm,
  ProfileStepForm,
} from "./onboarding-forms";

export const metadata: Metadata = {
  title: "Set up your group",
};

async function OnboardingContent() {
  await requireUser("/onboarding");
  const [profile, groups] = await Promise.all([getMyProfile(), getMyGroups()]);
  const hasName = Boolean(profile?.display_name?.trim());
  const backHref = groups[0] ? `/g/${groups[0].id}` : undefined;

  return (
    <div className="min-h-dvh bg-desk text-ink">
      <SimpleHeader backHref={backHref} backLabel="Back to group" />

      <main className="mx-auto max-w-[34rem] space-y-12 px-4 pt-8 pb-20">
        {!hasName ? (
          <section aria-labelledby="name-heading" className="space-y-4">
            <h1 id="name-heading" className="font-serif text-2xl text-ink">
              First, your name
            </h1>
            <p className="text-base text-pencil">
              This is how you show up on the weekly handout and in the rotation.
            </p>
            <ProfileStepForm
              profile={profile}
              nextPath="/onboarding"
              submitLabel="Save and continue"
            />
          </section>
        ) : (
          <>
            <section aria-labelledby="start-heading" className="space-y-4">
              <h1 id="start-heading" className="font-serif text-2xl text-ink">
                Start a group
              </h1>
              <p className="text-base text-pencil">
                You will be first in line to set week 1. Once the group is created, send the invite link to your friends.
              </p>
              <CreateGroupForm />
            </section>

            <section
              id="join"
              aria-labelledby="join-heading"
              className="space-y-4 border-t border-rule pt-10"
            >
              <h2 id="join-heading" className="font-serif text-2xl text-ink">
                Have an invite from a friend?
              </h2>
              <JoinByCodeForm />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[34rem] px-4 py-12 text-base text-pencil">
          Loading setup…
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
