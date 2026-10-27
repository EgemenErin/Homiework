import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import {
  ContactGroupFinder,
  ProfileStepForm,
} from "@/app/onboarding/onboarding-forms";
import { SimpleHeader, TabBar } from "@/components/group-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { safeNext } from "@/lib/actions";
import {
  getMyContactMatches,
  getMyGroups,
  getMyProfile,
  requireUser,
} from "@/lib/data";
import { LeaveGroupControl, PushSettings } from "./me-client";

export const metadata: Metadata = {
  title: "Me",
};

async function MeContent({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [user, profile, groups, contactData, query] = await Promise.all([
    requireUser("/me"),
    getMyProfile(),
    getMyGroups(),
    getMyContactMatches(),
    searchParams,
  ]);

  const from = safeNext(
    query.from,
    groups[0] ? `/g/${groups[0].id}` : "/onboarding",
  );
  const activeGroupIdMatch = /^\/g\/([0-9a-f-]{36})/i.exec(from);
  const activeGroupId = activeGroupIdMatch?.[1] ?? groups[0]?.id;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <div className="flex min-h-dvh flex-col bg-desk text-ink">
      <SimpleHeader backHref={from} backLabel="Back" />

      <main className="mx-auto w-full max-w-[34rem] flex-1 space-y-12 px-4 pt-6 pb-24">
        <section aria-labelledby="profile-heading" className="space-y-4">
          <div>
            <h1 id="profile-heading" className="font-serif text-2xl text-ink">
              Your profile
            </h1>
            <p className="text-sm text-pencil">
              {profile?.phone ? `${profile.phone} · ${user.email}` : user.email}
            </p>
          </div>
          <ProfileStepForm
            profile={profile}
            includeSurvey
            submitLabel="Save profile"
          />
        </section>

        <section
          aria-labelledby="contacts-me-heading"
          className="space-y-4 border-t border-rule pt-8"
        >
          <div className="space-y-1">
            <h2 id="contacts-me-heading" className="font-serif text-2xl text-ink">
              Find groups from your contacts{" "}
              <span className="font-sans text-base font-normal text-pencil">
                (optional)
              </span>
            </h2>
            <p className="text-base text-pencil">
              See if friends from your contacts are already running a study group.
            </p>
          </div>
          <ContactGroupFinder
            initialMatches={contactData.matches}
            initialContactsCount={contactData.contactsCount}
            initialPhone={profile?.phone ?? null}
          />
        </section>

        <section
          aria-labelledby="reminders-heading"
          className="space-y-3 border-t border-rule pt-8"
        >
          <h2 id="reminders-heading" className="font-serif text-2xl text-ink">
            Reminders
          </h2>
          <PushSettings vapidPublicKey={vapidPublicKey} />
        </section>

        <section
          aria-labelledby="groups-heading"
          className="space-y-4 border-t border-rule pt-8"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="groups-heading" className="font-serif text-2xl text-ink">
              Your groups
            </h2>
            <ButtonLink href="/onboarding" variant="tertiary">
              + Start or join a group
            </ButtonLink>
          </div>

          {groups.length === 0 ? (
            <p className="text-base text-pencil">
              You are not in a group yet.
            </p>
          ) : (
            <ul className="divide-y divide-rule/80 border-y border-rule">
              {groups.map((g) => (
                <li key={g.id} className="py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/g/${g.id}`}
                      className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
                    >
                      {g.name}
                    </Link>
                    <LeaveGroupControl groupId={g.id} groupName={g.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="Account actions"
          className="border-t border-rule pt-8"
        >
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="md">
              Sign out
            </Button>
          </form>
        </section>
      </main>

      {activeGroupId ? <TabBar groupId={activeGroupId} /> : null}
    </div>
  );
}

export default function MePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[34rem] px-4 py-12 text-base text-pencil">
          Loading profile…
        </div>
      }
    >
      <MeContent searchParams={searchParams} />
    </Suspense>
  );
}
