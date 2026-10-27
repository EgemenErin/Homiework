import type { ReactNode } from "react";
import { Suspense } from "react";
import { GroupTopBar, TabBar } from "@/components/group-nav";
import { getGroup, getMyGroups, getMyProfile, requireUser } from "@/lib/data";

async function TopChrome({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}`);
  const [{ group }, groups, profile] = await Promise.all([
    getGroup(groupId),
    getMyGroups(),
    getMyProfile(),
  ]);

  return (
    <GroupTopBar
      currentGroupId={group.id}
      currentGroupName={group.name}
      groups={groups}
      profile={profile}
    />
  );
}

async function BottomChrome({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <TabBar groupId={groupId} />;
}

export default function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-desk text-ink">
      <Suspense
        fallback={
          <header className="border-b border-rule/80 bg-desk">
            <div className="mx-auto flex h-16 max-w-[34rem] items-center px-4">
              <img
                src="/brand/wordmark.png"
                alt="Homiework"
                width={136}
                height={30}
                className="h-6 w-auto"
              />
            </div>
          </header>
        }
      >
        <TopChrome params={params} />
      </Suspense>

      <Suspense fallback={null}>
        <BottomChrome params={params} />
      </Suspense>

      <main className="mx-auto w-full max-w-[34rem] flex-1 px-4 pt-6 pb-16">
        {children}
      </main>
    </div>
  );
}
