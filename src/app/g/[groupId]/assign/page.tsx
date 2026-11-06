import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { displayName } from "@/components/ui/avatar";
import { getBacklog, getWeek, requireUser } from "@/lib/data";
import { nextMeetupDefault, toDateTimeLocal } from "@/lib/dates";
import { nextHost } from "@/lib/rotation";
import { getSyllabusPack } from "@/lib/syllabus-packs";
import {
  AssignForm,
  type ExamQuestionDraft,
  type ResourceDraft,
} from "./assign-form";

export const metadata: Metadata = {
  title: "Set this week's topic",
};

async function AssignContent({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ idea?: string; pack?: string; week?: string }>;
}) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  await requireUser(`/g/${groupId}/assign`);

  const [{ userId, group, members, round, resources, questions }, backlog] =
    await Promise.all([getWeek(groupId), getBacklog(groupId)]);

  if (!round || round.host_id !== userId) {
    redirect(`/g/${groupId}`);
  }

  const pickedIdea = query.idea
    ? backlog.open.find((s) => s.id === query.idea)
    : undefined;
  const topIdea = backlog.open[0] ?? null;

  const packId = query.pack ?? group.active_pack_id;
  const pack = getSyllabusPack(packId);
  const packWeekNum = query.week
    ? Number.parseInt(query.week, 10) || 1
    : group.active_pack_week || 1;
  const packWeekData = pack
    ? (pack.weeks.find((w) => w.weekNumber === packWeekNum) ?? pack.weeks[0])
    : null;

  const prefillFromQueryPack = Boolean(query.pack && packWeekData);

  const defaultMeetup = round.meetup_at
    ? new Date(round.meetup_at)
    : nextMeetupDefault(group.meet_weekday, group.meet_time, group.timezone);

  const defaultResources: ResourceDraft[] = prefillFromQueryPack
    ? packWeekData!.resources.map((r, i) => ({
        key: `pack-r-${i}`,
        url: r.url,
        label: r.label,
        kind: r.kind,
        minutes: String(r.minutes),
      }))
    : resources.map((r, i) => ({
        key: r.id || `r-${i}`,
        url: r.url,
        label: r.label,
        kind: r.kind,
        minutes: r.minutes ? String(r.minutes) : "",
      }));

  const defaultQuestions: ExamQuestionDraft[] = prefillFromQueryPack
    ? packWeekData!.exam_questions.map((q, i) => ({
        key: `pack-q-${i}`,
        prompt: q.prompt,
        options: [...q.options] as [string, string, string, string],
        correct_index: q.correct_index,
      }))
    : questions.map((q, i) => ({
        key: q.id || `q-${i}`,
        prompt: q.prompt,
        options: [
          q.options[0] ?? "",
          q.options[1] ?? "",
          q.options[2] ?? "",
          q.options[3] ?? "",
        ],
        correct_index: q.correct_index,
      }));

  const next = nextHost(members, round.host_id);
  const nextName =
    next && next.user_id !== round.host_id ? displayName(next.profile) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-pencil">Week {round.number}</p>
        <h1 className="mt-1 font-serif text-2xl text-ink">
          {round.status === "assigned"
            ? "Edit this week's topic"
            : "Set this week's topic"}
        </h1>
      </div>

      <AssignForm
        groupId={groupId}
        groupName={group.name}
        isClubPass={group.plan_tier === "club_pass"}
        roundId={round.id}
        roundNumber={round.number}
        isEditing={round.status === "assigned"}
        timezone={group.timezone}
        defaultTitle={
          prefillFromQueryPack
            ? packWeekData!.topic_title
            : (pickedIdea?.title ?? round.topic_title ?? "")
        }
        defaultWhy={
          prefillFromQueryPack
            ? packWeekData!.why
            : (pickedIdea?.pitch ?? round.why ?? "")
        }
        defaultMeetupLocal={toDateTimeLocal(defaultMeetup, group.timezone)}
        defaultPlace={round.meetup_place ?? ""}
        defaultResources={defaultResources}
        defaultQuestions={defaultQuestions}
        activePackTitle={pack?.title ?? null}
        activePackWeekData={packWeekData}
        topIdea={
          topIdea
            ? {
                id: topIdea.id,
                title: topIdea.title,
                pitch: topIdea.pitch,
                votes: topIdea.votes,
              }
            : null
        }
        nextHostName={nextName}
        canPass={members.length > 1}
      />
    </div>
  );
}

export default function AssignPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ idea?: string; pack?: string; week?: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-base text-pencil">Loading form…</p>}
    >
      <AssignContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
