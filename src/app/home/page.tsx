import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMyGroups, getMyProfile, requireUser } from "@/lib/data";

async function HomeRedirect() {
  await requireUser("/home");
  const [profile, groups] = await Promise.all([getMyProfile(), getMyGroups()]);

  if (!profile?.display_name?.trim() || groups.length === 0) {
    redirect("/onboarding");
  }

  redirect(`/g/${groups[0].id}`);
  return null;
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[34rem] px-4 py-12 text-base text-pencil">
      <Suspense fallback={<p>Opening your group…</p>}>
        <HomeRedirect />
      </Suspense>
    </div>
  );
}
