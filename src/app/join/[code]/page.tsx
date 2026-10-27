import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileStepForm } from "@/app/onboarding/onboarding-forms";
import { SimpleHeader } from "@/components/group-nav";
import { ButtonLink } from "@/components/ui/button";
import { getMyProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { JoinGroupButton } from "./join-button";

export const metadata: Metadata = {
  title: "Join group",
};

async function JoinBody({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    profile,
    previewRes,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getMyProfile(),
    supabase.rpc("invite_preview", { p_code: code }),
  ]);

  const preview = previewRes.data?.[0];

  if (!preview) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl text-ink">
          That invite link has expired.
        </h1>
        <p className="text-base text-pencil">
          Ask someone in the group to send you the current invite link from their Crew tab.
        </p>
        <ButtonLink href="/home" variant="secondary">
          Go to Homiework
        </ButtonLink>
      </div>
    );
  }

  if (user && preview.already_member) {
    redirect(`/g/${preview.group_id}`);
  }

  const hasName = Boolean(profile?.display_name?.trim());

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-pencil">Group invite</p>
        <h1 className="font-serif text-4xl leading-tight text-ink">
          {preview.name}
        </h1>
        <p className="text-base text-pencil">
          {preview.member_count}{" "}
          {preview.member_count === 1 ? "homie" : "homies"} in the rotation.
        </p>
      </div>

      {!user ? (
        <div className="space-y-4 border-t border-rule pt-6">
          <p className="text-base text-pencil">
            Sign in with your email to join the rotation.
          </p>
          <ButtonLink
            href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}
            variant="primary"
            size="lg"
          >
            Sign in to join {preview.name}
          </ButtonLink>
        </div>
      ) : !hasName ? (
        <div className="space-y-4 border-t border-rule pt-6">
          <h2 className="font-serif text-xl text-ink">
            Add your name before joining
          </h2>
          <ProfileStepForm
            profile={profile}
            nextPath={`/join/${code}`}
            submitLabel="Save name"
          />
        </div>
      ) : (
        <JoinGroupButton code={code} groupName={preview.name} />
      )}
    </div>
  );
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <div className="min-h-dvh bg-desk text-ink">
      <SimpleHeader />
      <main className="mx-auto max-w-[34rem] px-4 pt-10 pb-20">
        <Suspense fallback={<p className="text-base text-pencil">Checking invite…</p>}>
          <JoinBody params={params} />
        </Suspense>
      </main>
    </div>
  );
}
