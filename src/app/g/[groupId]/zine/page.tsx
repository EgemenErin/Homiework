import { Award, BookOpen, ChevronLeft, Lock, MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClubPassTrigger } from "@/components/club-pass-dialog";
import { Avatar, displayName } from "@/components/ui/avatar";
import { getSemesterZineData, requireUser } from "@/lib/data";
import { formatDayLong } from "@/lib/dates";
import { getSyllabusPack, letterGrade } from "@/lib/syllabus-packs";
import { PrintZineButton } from "./zine-client";

export const metadata: Metadata = {
  title: "Semester Syllabus Zine",
};

async function ZineContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}/zine`);

  const {
    group,
    members,
    rounds,
    resources,
    notes,
    examSubmissions,
    stats,
  } = await getSemesterZineData(groupId);

  const isClubPass = group.plan_tier === "club_pass";
  const byId = new Map(members.map((m) => [m.user_id, m.profile]));
  const activePack = getSyllabusPack(group.active_pack_id);

  // Compute fun Semester Superlatives from actual group activity
  const noteCounts = new Map<string, number>();
  for (const n of notes) {
    const count =
      (n.pre_study_note.trim() ? 1 : 0) + (n.post_meetup_note.trim() ? 1 : 0);
    if (count > 0) {
      noteCounts.set(n.user_id, (noteCounts.get(n.user_id) ?? 0) + count);
    }
  }

  const examTotals = new Map<string, { score: number; total: number }>();
  for (const sub of examSubmissions) {
    const cur = examTotals.get(sub.user_id) ?? { score: 0, total: 0 };
    examTotals.set(sub.user_id, {
      score: cur.score + sub.score,
      total: cur.total + sub.total,
    });
  }

  const topStreakMember = members.toSorted(
    (a, b) =>
      Number(stats.get(b.user_id)?.streak ?? 0) -
      Number(stats.get(a.user_id)?.streak ?? 0),
  )[0];

  const topScribeMember = members.toSorted(
    (a, b) => (noteCounts.get(b.user_id) ?? 0) - (noteCounts.get(a.user_id) ?? 0),
  )[0];

  const topScholarMember = members.toSorted((a, b) => {
    const ea = examTotals.get(a.user_id);
    const eb = examTotals.get(b.user_id);
    const ra = ea && ea.total > 0 ? ea.score / ea.total : -1;
    const rb = eb && eb.total > 0 ? eb.score / eb.total : -1;
    return rb - ra;
  })[0];

  const visibleRounds = isClubPass ? rounds : rounds.slice(0, 1);
  const lockedRoundsCount = Math.max(0, rounds.length - visibleRounds.length);

  return (
    <div className="space-y-8 pb-12">
      {/* Top action bar (hidden when printing to PDF) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/g/${groupId}`}
          className="inline-flex min-h-11 items-center gap-1 text-base font-semibold text-ink hover:underline"
        >
          <ChevronLeft aria-hidden className="size-5" />
          <span>Back to this week</span>
        </Link>

        {isClubPass ? (
          <PrintZineButton />
        ) : (
          <ClubPassTrigger
            groupId={groupId}
            groupName={group.name}
            isClubPass={isClubPass}
            triggerLabel="Unlock Full Zine PDF ($5/mo)"
            variant="primary"
          />
        )}
      </div>

      {/* Zine Cover Sheet */}
      <article className="paper-ruled space-y-6 rounded-md border-2 border-ink py-8 pr-6 pl-12 shadow-paper">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
          <div>
            <p className="text-sm font-semibold text-pencil">
              Quarterly Study Compendium · {rounds.length}{" "}
              {rounds.length === 1 ? "Week" : "Weeks"} Recorded
            </p>
            <h1 className="mt-1 font-serif text-4xl leading-tight text-ink">
              {group.name}
            </h1>
            {group.university_name ? (
              <p className="mt-1 text-sm font-semibold text-ink">
                {group.university_name} Study Circle
              </p>
            ) : null}
          </div>

          <div className="stamp rounded-md border-2 border-red bg-paper px-3 py-1.5 text-left text-red">
            <div className="text-xs font-semibold">
              {group.stamp_motto.trim() || "SYLLABUS ZINE"}
            </div>
            <div className="font-serif text-base font-semibold">
              Vol. I · 3-Month Issue
            </div>
          </div>
        </div>

        {activePack ? (
          <div className="rounded-md border border-rule bg-desk-deep/70 px-4 py-2.5 text-sm">
            <span className="font-semibold text-ink">Mastery Focus:</span>{" "}
            <span>{activePack.title}</span>{" "}
            <span className="text-pencil">({activePack.estimatedMonths})</span>
          </div>
        ) : null}

        {/* Enrolled Fellows & Superlatives */}
        <div className="grid gap-4 sm:grid-cols-3">
          {topStreakMember ? (
            <div className="rounded-md border border-rule bg-paper p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-pencil">
                <Award aria-hidden className="size-4 text-red" />
                <span>Iron Attendance</span>
              </p>
              <p className="mt-1 font-serif text-lg text-ink">
                {displayName(topStreakMember.profile)}
              </p>
              <p className="text-sm text-pencil">
                {Number(stats.get(topStreakMember.user_id)?.streak ?? 0)}w streak
              </p>
            </div>
          ) : null}

          {topScribeMember && (noteCounts.get(topScribeMember.user_id) ?? 0) > 0 ? (
            <div className="rounded-md border border-rule bg-paper p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-pencil">
                <BookOpen aria-hidden className="size-4 text-ink" />
                <span>Chief Margin Scribe</span>
              </p>
              <p className="mt-1 font-serif text-lg text-ink">
                {displayName(topScribeMember.profile)}
              </p>
              <p className="text-sm text-pencil">
                {noteCounts.get(topScribeMember.user_id)} notes in the margins
              </p>
            </div>
          ) : null}

          {topScholarMember && examTotals.has(topScholarMember.user_id) ? (
            <div className="rounded-md border border-rule bg-paper p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-pencil">
                <Award aria-hidden className="size-4 text-red" />
                <span>Pop Quiz Valedictorian</span>
              </p>
              <p className="mt-1 font-serif text-lg text-ink">
                {displayName(topScholarMember.profile)}
              </p>
              <p className="text-sm text-pencil">
                Grade:{" "}
                {
                  letterGrade(
                    examTotals.get(topScholarMember.user_id)!.score,
                    examTotals.get(topScholarMember.user_id)!.total,
                  ).grade
                }
              </p>
            </div>
          ) : null}
        </div>

        {/* Crew Roster */}
        <div className="space-y-2 border-t border-rule pt-4">
          <p className="text-sm font-semibold text-pencil">
            Fellows of the Study Club ({members.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2">
                <Avatar profile={m.profile} size="sm" />
                <span className="font-semibold text-ink">
                  {displayName(m.profile)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Week-by-Week Zine Pages */}
      <div className="space-y-8">
        {visibleRounds.map((r) => {
          const host = r.host_id ? byId.get(r.host_id) : null;
          const roundResources = resources.filter((res) => res.round_id === r.id);
          const roundNotes = notes.filter(
            (n) =>
              n.round_id === r.id &&
              (n.pre_study_note.trim() || n.post_meetup_note.trim()),
          );
          const roundExams = examSubmissions.filter((e) => e.round_id === r.id);

          return (
            <article
              key={r.id}
              className="paper-ruled space-y-5 rounded-md border border-rule py-6 pr-5 pl-12 shadow-paper break-inside-avoid"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
                <p className="text-sm text-pencil">
                  Week {r.number} · Hosted by{" "}
                  <span className="font-semibold text-ink">
                    {displayName(host)}
                  </span>
                </p>
                {r.meetup_at ? (
                  <p className="text-sm text-pencil">
                    {formatDayLong(r.meetup_at, group.timezone)}
                    {r.meetup_place ? ` · ${r.meetup_place}` : ""}
                  </p>
                ) : null}
              </div>

              <div>
                <h2 className="font-serif text-2xl text-ink">{r.topic_title}</h2>
                {r.why ? (
                  <p className="mt-2 text-base text-pencil">{r.why}</p>
                ) : null}
              </div>

              {roundResources.length > 0 ? (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-pencil">
                    Assigned Syllabus
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                    {roundResources.map((res) => (
                      <li key={res.id}>
                        <span className="font-semibold">{res.label}</span>{" "}
                        <span className="text-pencil">
                          ({res.kind}
                          {res.minutes ? `, ${res.minutes}m` : ""})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {roundNotes.length > 0 ? (
                <div className="space-y-3 border-t border-rule pt-4">
                  <h3 className="text-sm font-semibold text-ink">
                    Margin Notes &amp; Post-Meetup Quotes
                  </h3>
                  <div className="space-y-3">
                    {roundNotes.map((n) => {
                      const author = displayName(byId.get(n.user_id));
                      return (
                        <div
                          key={n.user_id}
                          className="space-y-1.5 rounded-md border border-rule/80 bg-paper/90 p-3"
                        >
                          <p className="text-sm font-semibold text-ink">
                            {author}
                          </p>
                          {n.pre_study_note.trim() ? (
                            <p className="text-sm text-ink">
                              <span className="font-semibold text-pencil">
                                While studying:{" "}
                              </span>
                              {n.pre_study_note}
                            </p>
                          ) : null}
                          {n.post_meetup_note.trim() ? (
                            <p className="flex items-start gap-1.5 text-sm text-ink">
                              <MessageSquareQuote
                                aria-hidden
                                className="mt-0.5 size-3.5 shrink-0 text-red"
                              />
                              <span>
                                <span className="font-semibold text-red">
                                  After meetup:{" "}
                                </span>
                                &ldquo;{n.post_meetup_note}&rdquo;
                              </span>
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {roundExams.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-3 text-sm">
                  <span className="font-semibold text-pencil">Quiz Grades:</span>
                  {roundExams.map((sub) => (
                    <span
                      key={sub.user_id}
                      className="highlighted px-1.5 font-semibold text-ink"
                    >
                      {displayName(byId.get(sub.user_id))}:{" "}
                      {letterGrade(sub.score, sub.total).grade} ({sub.score}/
                      {sub.total})
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Teaser banner if on Free tier and there are more weeks */}
      {!isClubPass ? (
        <div className="space-y-4 rounded-md border-2 border-rule bg-desk-deep p-6 print:hidden">
          <div className="flex items-center gap-2 text-red">
            <Lock aria-hidden className="size-4" />
            <span className="text-sm font-semibold">
              Homiework Club Pass · Quarterly Zine Export
            </span>
          </div>
          <h2 className="font-serif text-2xl text-ink">
            {lockedRoundsCount > 0
              ? `Unlock ${lockedRoundsCount} more ${lockedRoundsCount === 1 ? "week" : "weeks"} of notes & print your Semester Zine PDF`
              : "Print & export your group's 3-Month Semester Syllabus Zine PDF"}
          </h2>
          <p className="text-base text-pencil">
            Everyone&apos;s pre-meetup margin notes and post-meetup reflections are
            saved automatically every week. Upgrade{" "}
            <span className="font-semibold text-ink">{group.name}</span> to Club Pass
            to compile all 3 months into a printable PDF booklet.
          </p>
          <ClubPassTrigger
            groupId={groupId}
            groupName={group.name}
            isClubPass={isClubPass}
            triggerLabel="Unlock Full Semester Zine PDF ($5/mo)"
            variant="primary"
          />
        </div>
      ) : null}
    </div>
  );
}

export default function SemesterZinePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-base text-pencil">Compiling zine…</p>}
    >
      <ZineContent params={params} />
    </Suspense>
  );
}
