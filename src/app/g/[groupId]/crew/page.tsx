import { Lock, Printer } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubPassTrigger } from "@/components/club-pass-dialog";
import { Avatar, displayName } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import {
  getCrew,
  getStats,
  requireUser,
  type Member,
  type RoundExamSubmission,
} from "@/lib/data";
import { formatDayLong, WEEKDAYS } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";
import { letterGrade } from "@/lib/syllabus-packs";
import {
  CalendarAndDiscordSection,
  CampusCircleSection,
  ClubStyleSection,
  InviteBox,
  MeetupPotSection,
  RotationReorderTrigger,
} from "./crew-client";

export const metadata: Metadata = {
  title: "Crew",
};

async function MemberRosterWithStats({
  groupId,
  members,
  currentHostId,
  nextHostId,
  examSubmissions,
}: {
  groupId: string;
  members: readonly Member[];
  currentHostId: string | null;
  nextHostId: string | null;
  examSubmissions: readonly RoundExamSubmission[];
}) {
  const stats = await getStats(groupId);

  const examMap = new Map<string, { score: number; total: number }>();
  for (const sub of examSubmissions) {
    const cur = examMap.get(sub.user_id) ?? { score: 0, total: 0 };
    examMap.set(sub.user_id, {
      score: cur.score + sub.score,
      total: cur.total + sub.total,
    });
  }

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
        const exam = examMap.get(m.user_id);
        const gpaLabel =
          exam && exam.total > 0
            ? ` · GPA: ${letterGrade(exam.score, exam.total).grade}`
            : "";

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
                    ? `${attended}/${held} meetups attended${gpaLabel}`
                    : `No meetups closed yet${gpaLabel}`}
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
  const {
    userId,
    group,
    members,
    round,
    past,
    potEntries,
    examSubmissions,
  } = await getCrew(groupId);

  const me = members.find((m) => m.user_id === userId);
  const isOwner = me?.role === "owner";
  const isClubPass = group.plan_tier === "club_pass";
  const currentHostId = round?.host_id ?? null;
  const next = nextHost(members, currentHostId);
  const byId = new Map(members.map((m) => [m.user_id, m.profile]));

  // Free Plan shows last 3 closed weeks; Club Pass shows full archive
  const visiblePast = isClubPass ? past : past.slice(0, 3);
  const hiddenPastCount = Math.max(0, past.length - visiblePast.length);

  return (
    <div className="space-y-10">
      <section aria-labelledby="rotation-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                id="rotation-heading"
                className="font-serif text-2xl text-ink"
              >
                {group.name}
              </h1>
              {group.university_name ? (
                <span className="rounded-md border border-rule bg-desk-deep px-2 py-0.5 text-xs font-semibold text-ink">
                  {group.university_name}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-pencil">
              Usual meetup: {WEEKDAYS[group.meet_weekday]}s at{" "}
              {group.meet_time.slice(0, 5)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isOwner && members.length > 1 ? (
              <RotationReorderTrigger groupId={groupId} members={members} />
            ) : null}
          </div>
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
            examSubmissions={examSubmissions}
          />
        </Suspense>
      </section>

      {/* Semester Syllabus Zine Banner */}
      <section
        aria-labelledby="zine-banner-heading"
        className="paper-ruled space-y-3 rounded-md border border-rule py-5 pr-5 pl-12 shadow-paper"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red">
              Quarterly Study Booklet
            </p>
            <h2
              id="zine-banner-heading"
              className="font-serif text-xl text-ink"
            >
              3-Month Semester Syllabus Zine
            </h2>
            <p className="max-w-[54ch] text-sm text-pencil">
              Every week&apos;s handout, study margin notes, post-meetup quotes,
              and exam grades compiled into a printable PDF booklet.
            </p>
          </div>
          <ButtonLink
            href={`/g/${groupId}/zine`}
            variant="secondary"
            size="md"
          >
            <Printer aria-hidden className="size-4" />
            <span>{isClubPass ? "Open & Print Zine" : "Preview Zine"}</span>
          </ButtonLink>
        </div>
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

      {/* Calendar & Discord Integrations (Free Must-Have) */}
      <CalendarAndDiscordSection
        groupId={groupId}
        initialWebhookUrl={group.discord_webhook_url}
      />

      {/* Optional Peer-to-Peer Meetup Pot / Homework Jar */}
      <MeetupPotSection
        groupId={groupId}
        potEnabled={group.pot_enabled}
        potStakeText={group.pot_stake_text}
        potEntries={potEntries}
        members={members}
      />

      {/* University Circle / Campus Club Settings (Free) */}
      <CampusCircleSection
        groupId={groupId}
        initialUniversity={group.university_name}
        initialPublic={group.is_campus_public}
      />

      {/* Custom Club Stamp & Paper Theme (Club Pass) */}
      <ClubStyleSection
        groupId={groupId}
        groupName={group.name}
        isClubPass={isClubPass}
        initialPaperTheme={group.paper_theme}
        initialStampStyle={group.stamp_style}
        initialStampMotto={group.stamp_motto}
      />

      {/* Past Weeks Archive (Last 3 weeks on Free Tier, Unlimited on Club Pass) */}
      <section aria-labelledby="past-heading" className="space-y-3 border-t border-rule pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="past-heading" className="text-lg font-semibold text-ink">
            Past weeks ({past.length})
          </h2>
          {!isClubPass ? (
            <span className="text-sm text-pencil">
              Free plan shows last 3 weeks
            </span>
          ) : null}
        </div>

        {past.length === 0 ? (
          <p className="text-base text-pencil">
            Finished weeks show up here once your first meetup is closed.
          </p>
        ) : (
          <ol className="divide-y divide-rule/80 border-t border-rule">
            {visiblePast.map((r) => {
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

        {hiddenPastCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-desk-deep p-4">
            <div className="flex items-center gap-2 text-sm text-ink">
              <Lock aria-hidden className="size-4 text-red" />
              <span>
                +{hiddenPastCount} older{" "}
                {hiddenPastCount === 1 ? "week" : "weeks"} in your archive
              </span>
            </div>
            <ClubPassTrigger
              groupId={groupId}
              groupName={group.name}
              isClubPass={isClubPass}
              triggerLabel="Unlock Full Archive"
              variant="secondary"
            />
          </div>
        ) : null}
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
