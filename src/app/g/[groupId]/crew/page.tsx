import type { Metadata } from "next";
import { Suspense } from "react";
import { Avatar, displayName } from "@/components/ui/avatar";
import { getCrew, getStats, requireUser, type Member } from "@/lib/data";
import { formatDayLong, WEEKDAYS } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";
import { InviteBox, RotationReorderTrigger } from "./crew-client";

export const metadata: Metadata = {
  title: "Crew",
};

async function MemberRosterWithStats({
  groupId,
  members,
  currentHostId,
  nextHostId,
}: {
  groupId: string;
  members: readonly Member[];
  currentHostId: string | null;
  nextHostId: string | null;
}) {
  const stats = await getStats(groupId);

  return (
    <ol className="divide-y divide-rule/80 border-y border-rule">
      {members.map((m, idx) => {
        const s = stats.get(m.user_id);
        const streak = Number(s?.streak ?? 0);
        const attended = Number(s?.attended ?? 0);
        const held = Number(s?.held ?? 0);
        const isCurrent = m.user_id === currentHostId;
        const isNext =
          !isCurrent && m.user_id === nextHostId && members.length > 1;
        const name = displayName(m.profile);

        return (
          <li
            key={m.user_id}
            className="flex items-center justify-between gap-3 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-5 shrink-0 text-sm text-pencil">
                {idx + 1}.
              </span>
              <Avatar
                profile={m.profile}
                size="md"
                ring={isCurrent}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-ink">
                    {name}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-sm border border-red px-1.5 py-0.5 text-xs font-semibold text-red">
                      This week
                    </span>
                  ) : isNext ? (
                    <span className="text-sm text-pencil">Up next</span>
                  ) : null}
                </div>
                <p className="text-sm text-pencil">
                  {held > 0
                    ? `${attended}/${held} meetups attended`
                    : "No meetups closed yet"}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {streak > 0 ? (
                <span className="highlighted px-1.5 font-semibold text-ink">
                  {streak}w streak
                </span>
              ) : (
                <span className="text-sm text-pencil">0w streak</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

async function CrewContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}/crew`);
  const { userId, group, members, round, past } = await getCrew(groupId);

  const me = members.find((m) => m.user_id === userId);
  const isOwner = me?.role === "owner";
  const currentHostId = round?.host_id ?? null;
  const next = nextHost(members, currentHostId);
  const byId = new Map(members.map((m) => [m.user_id, m.profile]));

  return (
    <div className="space-y-10">
      <section aria-labelledby="rotation-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 id="rotation-heading" className="font-serif text-2xl text-ink">
              {group.name}
            </h1>
            <p className="mt-1 text-sm text-pencil">
              Usual meetup: {WEEKDAYS[group.meet_weekday]}s at{" "}
              {group.meet_time.slice(0, 5)}
            </p>
          </div>
          {isOwner && members.length > 1 ? (
            <RotationReorderTrigger groupId={groupId} members={members} />
          ) : null}
        </div>

        <Suspense
          fallback={
            <p className="py-4 text-base text-pencil">
              Loading rotation and streaks…
            </p>
          }
        >
          <MemberRosterWithStats
            groupId={groupId}
            members={members}
            currentHostId={currentHostId}
            nextHostId={next?.user_id ?? null}
          />
        </Suspense>
      </section>

      <section aria-labelledby="invite-heading" className="space-y-3">
        <h2 id="invite-heading" className="text-lg font-semibold text-ink">
          Invite a homie
        </h2>
        <p className="text-sm text-pencil">
          Anyone with this link joins the end of the rotation.
        </p>
        <InviteBox
          groupId={groupId}
          groupName={group.name}
          inviteCode={group.invite_code}
          isOwner={isOwner}
        />
      </section>

      <section aria-labelledby="past-heading" className="space-y-3">
        <h2 id="past-heading" className="text-lg font-semibold text-ink">
          Past weeks ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="text-base text-pencil">
            Finished weeks show up here once your first meetup is closed.
          </p>
        ) : (
          <ol className="divide-y divide-rule/80 border-t border-rule">
            {past.map((r) => {
              const host = r.host_id ? byId.get(r.host_id) : null;
              return (
                <li key={r.id} className="py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-ink">
                      {r.topic_title}
                    </span>
                    <span className="shrink-0 text-sm text-pencil">
                      Week {r.number}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-pencil">
                    Set by {displayName(host)}
                    {r.meetup_at
                      ? `, ${formatDayLong(r.meetup_at, group.timezone)}`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function CrewPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-base text-pencil">Loading crew…</p>}>
      <CrewContent params={params} />
    </Suspense>
  );
}
