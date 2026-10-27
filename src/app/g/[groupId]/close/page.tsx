import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { displayName } from "@/components/ui/avatar";
import { getWeek, requireUser } from "@/lib/data";
import { nextHost } from "@/lib/rotation";
import { CloseRoundForm } from "./close-form";

export const metadata: Metadata = {
  title: "Close the week",
};

async function CloseContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}/close`);
  const { userId, members, round, rsvps, checkins } = await getWeek(groupId);

  const me = members.find((m) => m.user_id === userId);
  const canClose =
    round &&
    round.status === "assigned" &&
    (round.host_id === userId || me?.role === "owner");

  if (!canClose || !round) {
    redirect(`/g/${groupId}`);
  }

  const goingIds = rsvps
    .filter((r) => r.status === "going")
    .map((r) => r.user_id);
  const doneIds = checkins.map((c) => c.user_id);
  const defaultAttended =
    goingIds.length > 0 ? goingIds : doneIds.length > 0 ? doneIds : [userId];

  const next = nextHost(members, round.host_id);
  const nextName = next ? displayName(next.profile) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-pencil">Week {round.number}</p>
        <h1 className="mt-1 font-serif text-2xl text-ink">
          Close &ldquo;{round.topic_title}&rdquo;
        </h1>
      </div>

      <CloseRoundForm
        groupId={groupId}
        roundId={round.id}
        roundNumber={round.number}
        members={members}
        defaultAttendedIds={defaultAttended}
        doneIds={doneIds}
        nextHostName={nextName}
      />
    </div>
  );
}

export default function ClosePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-base text-pencil">Loading attendance…</p>}
    >
      <CloseContent params={params} />
    </Suspense>
  );
}
