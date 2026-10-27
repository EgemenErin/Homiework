import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleHeader } from "@/components/group-nav";
import {
  getMyContactMatches,
  getMyGroups,
  getMyProfile,
  requireUser,
} from "@/lib/data";
import { OnboardingWizard } from "./onboarding-forms";

export const metadata: Metadata = {
  title: "Set up your group",
};

async function OnboardingContent() {
  await requireUser("/onboarding");
  const [profile, groups, contactData] = await Promise.all([
    getMyProfile(),
    getMyGroups(),
    getMyContactMatches(),
  ]);
  const backHref = groups[0] ? `/g/${groups[0].id}` : undefined;

  return (
    <div className="min-h-dvh bg-desk text-ink overflow-x-hidden">
      <SimpleHeader backHref={backHref} backLabel="Back to group" />

      <main className="mx-auto max-w-[34rem] px-4 pt-6 pb-20">
        <OnboardingWizard
          profile={profile}
          initialMatches={contactData.matches}
          initialContactsCount={contactData.contactsCount}
        />
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
