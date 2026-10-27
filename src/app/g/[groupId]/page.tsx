import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AvatarRow, Handout, ResourceList } from "@/components/handout";
import { displayName } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import {
  CheckinButton,
  PassTurnButton,
  RsvpControl,
} from "@/components/week-controls";
import { getWeek, requireUser } from "@/lib/data";
import { formatMeetup } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";

export const metadata: Metadata = {
  title: "This week",
};

async function WeekContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}`);
  const {
    userId,
    group,
    members,
    round,
    isFresh,
    lastClosed,
    resources,
    rsvps,
    checkins,
  } = await getWeek(groupId);

  if (!round) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl text-ink">No active week yet</h1>
        <p className="text-base text-pencil">
          Invite a friend from the Crew tab to start the rotation.
        </p>
        <ButtonLink href={`/g/${groupId}/crew`} variant="primary">
          Open Crew
        </ButtonLink>
      </div>
    );
  }

  const hostMember = members.find((m) => m.user_id === round.host_id);
  const hostName = displayName(hostMember?.profile);
  const isHost = round.host_id === userId;
  const myMember = members.find((m) => m.user_id === userId);
  const isOwner = myMember?.role === "owner";
  const nextMember = nextHost(members, round.host_id);
  const nextName =
    nextMember && nextMember.user_id !== round.host_id
      ? displayName(nextMember.profile)
      : null;

  // State 1: Waiting for the host to set this week's topic
  if (round.status === "awaiting_topic") {
    return (
      <div className="space-y-8">
        <article className="paper-ruled rounded-md border border-rule/80 py-6 pr-5 pl-12 shadow-paper">
          <p className="text-sm text-pencil">Week {round.number}</p>
          {isHost ? (
            <>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
                It&apos;s your turn to set the homework.
              </h1>
              <p className="mt-3 max-w-[56ch] text-base text-ink">
                Pick a subject for the group to study, attach two or three links, and confirm when and where you are meeting.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <ButtonLink
                  href={`/g/${groupId}/assign`}
                  variant="primary"
                  size="lg"
                >
                  Set this week&apos;s topic
                </ButtonLink>
                {members.length > 1 ? (
                  <PassTurnButton
                    groupId={groupId}
                    roundId={round.id}
                    nextHostName={nextName}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-ink">
                Waiting on {hostName} to set the topic.
              </h1>
              <p className="mt-3 max-w-[56ch] text-base text-pencil">
                {hostName} has the pen for week {round.number}. While you wait, add or upvote ideas in the backlog.
              </p>
              <div className="mt-6">
                <ButtonLink href={`/g/${groupId}/backlog`} variant="secondary">
                  Open topic backlog
                </ButtonLink>
              </div>
            </>
          )}
        </article>

        {lastClosed ? (
          <section aria-labelledby="last-week-heading" className="space-y-1">
            <h2 id="last-week-heading" className="text-sm text-pencil">
              Last week (week {lastClosed.number})
            </h2>
            <p className="font-semibold text-ink">{lastClosed.topic_title}</p>
          </section>
        ) : null}
      </div>
    );
  }

  // State 2: Topic is assigned
  const doneIds = new Set(checkins.map((c) => c.user_id));
  const myDone = doneIds.has(userId);
  const myRsvp =
    (rsvps.find((r) => r.user_id === userId)?.status as
      | "going"
      | "maybe"
      | "out"
      | undefined) ?? null;

  const rsvpCounts = {
    going: rsvps.filter((r) => r.status === "going").length,
    maybe: rsvps.filter((r) => r.status === "maybe").length,
    out: rsvps.filter((r) => r.status === "out").length,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Handout
          round={round}
          hostName={hostName}
          timezone={group.timezone}
          fresh={isFresh}
        />

        {isHost ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-pencil">You set this week&apos;s topic.</span>
            <div className="flex items-center gap-4">
              <Link
                href={`/g/${groupId}/assign`}
                className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
              >
                Edit topic
              </Link>
              <Link
                href={`/g/${groupId}/close`}
                className="inline-flex min-h-11 items-center font-semibold text-red underline decoration-red/40 decoration-2 underline-offset-4 hover:decoration-red"
              >
                Close the week
              </Link>
            </div>
          </div>
        ) : isOwner ? (
          <div className="flex justify-end text-sm">
            <Link
              href={`/g/${groupId}/close`}
              className="inline-flex min-h-11 items-center font-semibold text-pencil underline decoration-rule decoration-2 underline-offset-4 hover:text-ink"
            >
              Close the week
            </Link>
          </div>
        ) : null}
      </div>

      {/* Primary action on the screen */}
      <CheckinButton roundId={round.id} initialDone={myDone} />

      {/* Meetup time, place, and RSVP */}
      <section aria-labelledby="meetup-heading" className="space-y-3">
        <div>
          <h2 id="meetup-heading" className="text-lg font-semibold text-ink">
            {round.meetup_at
              ? formatMeetup(round.meetup_at, group.timezone)
              : "Meetup time to be confirmed"}
          </h2>
          <p className="text-base text-pencil">
            {round.meetup_place || "Place to be decided in the group chat"}
          </p>
        </div>

        <RsvpControl
          roundId={round.id}
          initialStatus={myRsvp}
          counts={rsvpCounts}
        />
      </section>

      {/* Homework links */}
      <section aria-labelledby="homework-heading" className="space-y-2">
        <h2 id="homework-heading" className="text-lg font-semibold text-ink">
          Homework
        </h2>
        <ResourceList resources={resources} />
      </section>

      {/* Who's done */}
      <section aria-labelledby="done-heading" className="space-y-3">
        <h2 id="done-heading" className="text-lg font-semibold text-ink">
          Who&apos;s done
        </h2>
        <AvatarRow members={members} doneIds={doneIds} />
      </section>
    </div>
  );
}

export default function GroupWeekPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-base text-pencil">Loading this week…</p>}
    >
      <WeekContent params={params} />
    </Suspense>
  );
}
