import type { Metadata } from "next";
import { Suspense } from "react";
import { CampusClubsDirectory } from "@/components/campus-directory";
import { SimpleHeader } from "@/components/group-nav";
import {
  getCampusGroups,
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
  const [profile, groups, contactData, campusClubs] = await Promise.all([
    getMyProfile(),
    getMyGroups(),
    getMyContactMatches(),
    getCampusGroups(),
  ]);
  const backHref = groups[0] ? `/g/${groups[0].id}` : undefined;

  return (
    <div className="min-h-dvh bg-desk text-ink overflow-x-hidden">
      <SimpleHeader backHref={backHref} backLabel="Back to group" />

      <main className="mx-auto max-w-[34rem] space-y-10 px-4 pt-6 pb-20">
        <OnboardingWizard
          profile={profile}
          initialMatches={contactData.matches}
          initialContactsCount={contactData.contactsCount}
        />

        <section
          aria-labelledby="onboarding-campus-heading"
          className="space-y-3 border-t border-rule pt-8"
        >
          <h2
            id="onboarding-campus-heading"
            className="font-serif text-2xl text-ink"
          >
            Join a University Club
          </h2>
          <CampusClubsDirectory initialClubs={campusClubs} />
        </section>
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
