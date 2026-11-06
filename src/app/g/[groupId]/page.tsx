import { CalendarPlus, Coffee } from "lucide-react";
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
import { WeekExamSection } from "@/components/week-exam";
import { WeekNotesSection } from "@/components/week-notes";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from "@/lib/calendar";
import { getWeek, requireUser } from "@/lib/data";
import { formatMeetup } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";
import { getSyllabusPack } from "@/lib/syllabus-packs";

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
    notes,
    questions,
    examSubmissions,
    potEntries,
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

  const activePack = getSyllabusPack(group.active_pack_id);
  const activePackBadge = activePack
    ? `${activePack.title} · Week ${Math.min(group.active_pack_week || 1, activePack.weeksCount)}/${activePack.weeksCount}`
    : null;

  const unsettledPotCount = potEntries.filter((p) => !p.settled).length;

  // State 1: Waiting for the host to set this week's topic
  if (round.status === "awaiting_topic") {
    return (
      <div className="space-y-8">
        <article className="paper-ruled rounded-md border border-rule/80 py-6 pr-5 pl-12 shadow-paper">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-pencil">Week {round.number}</p>
            {activePackBadge ? (
              <span className="highlighted px-1.5 text-sm font-semibold text-ink">
                {activePackBadge}
              </span>
            ) : null}
          </div>
          {isHost ? (
            <>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
                It&apos;s your turn to set the homework.
              </h1>
              <p className="mt-3 max-w-[56ch] text-base text-ink">
                {activePack
                  ? `Load Week ${Math.min(group.active_pack_week || 1, activePack.weeksCount)} from "${activePack.title}" in one tap, or pick your own topic and links.`
                  : "Pick a subject for the group to study, attach two or three links, and confirm when and where you are meeting."}
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
                {hostName} has the pen for week {round.number}. While you wait,
                browse Syllabus Packs or upvote ideas in the backlog.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ButtonLink href={`/g/${groupId}/backlog`} variant="secondary">
                  Open backlog &amp; syllabus packs
                </ButtonLink>
                <ButtonLink href={`/g/${groupId}/zine`} variant="tertiary">
                  View Semester Zine
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

  const calEvent = round.meetup_at
    ? {
        roundId: round.id,
        roundNumber: round.number,
        groupName: group.name,
        topicTitle: round.topic_title ?? `Week ${round.number}`,
        why: round.why,
        meetupAtIso: round.meetup_at,
        meetupPlace: round.meetup_place,
        resources: resources.map((r) => ({ label: r.label, url: r.url })),
      }
    : null;

  const gcalUrl = calEvent ? buildGoogleCalendarUrl(calEvent) : null;
  const outlookUrl = calEvent ? buildOutlookCalendarUrl(calEvent) : null;
  const icsUrl = `/api/g/${groupId}/calendar.ics?round=${round.id}`;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Handout
          round={round}
          hostName={hostName}
          timezone={group.timezone}
          fresh={isFresh}
          paperTheme={group.paper_theme}
          stampStyle={group.stamp_style}
          stampMotto={group.stamp_motto}
          activePackBadge={activePackBadge}
        />

        {isHost ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-pencil">You set this week&apos;s topic.</span>
            <div className="flex items-center gap-4">
              <Link
                href={`/g/${groupId}/assign`}
                className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
              >
                Edit topic &amp; quiz
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

      {/* Meetup time, place, Calendar sync, and RSVP */}
      <section aria-labelledby="meetup-heading" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
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

          {calEvent ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CalendarPlus aria-hidden className="size-4 text-pencil" />
              {gcalUrl ? (
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center rounded-md border border-rule bg-desk-deep px-2.5 py-1 font-semibold text-ink hover:border-ink/60"
                >
                  Google Cal
                </a>
              ) : null}
              {outlookUrl ? (
                <a
                  href={outlookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center rounded-md border border-rule bg-desk-deep px-2.5 py-1 font-semibold text-ink hover:border-ink/60"
                >
                  Outlook
                </a>
              ) : null}
              <a
                href={icsUrl}
                download
                className="inline-flex min-h-9 items-center rounded-md border border-rule bg-desk-deep px-2.5 py-1 font-semibold text-ink hover:border-ink/60"
              >
                Apple / .ics
              </a>
            </div>
          ) : null}
        </div>

        <RsvpControl
          roundId={round.id}
          initialStatus={myRsvp}
          counts={rsvpCounts}
        />

        {group.pot_enabled ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rule bg-desk-deep/70 px-3.5 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-ink">
              <Coffee aria-hidden className="size-4 shrink-0 text-pencil" />
              <span>
                <span className="font-semibold">Homework Jar:</span>{" "}
                {group.pot_stake_text}
                {unsettledPotCount > 0
                  ? ` · ${unsettledPotCount} ${unsettledPotCount === 1 ? "iou" : "ious"} in the pot`
                  : " · Pot is clean"}
              </span>
            </span>
            <Link
              href={`/g/${groupId}/crew#meetup-pot`}
              className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
            >
              View pot
            </Link>
          </div>
        ) : null}
      </section>

      {/* Homework links (with automatic book/media affiliate enrichment) */}
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

      {/* Weekly Pop Quiz ("Exam Your Friends" — Club Pass) */}
      <WeekExamSection
        groupId={groupId}
        groupName={group.name}
        roundId={round.id}
        userId={userId}
        isClubPass={group.plan_tier === "club_pass"}
        questions={questions}
        submissions={examSubmissions}
        members={members}
      />

      {/* Pre-Meetup Study Margin Notes & Post-Meetup Takeaways (Free for all groups) */}
      <WeekNotesSection
        groupId={groupId}
        roundId={round.id}
        userId={userId}
        members={members}
        notes={notes}
        isClubPass={group.plan_tier === "club_pass"}
      />
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
