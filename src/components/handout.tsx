import { BookOpen, Check, ExternalLink, Headphones, Link2, Play } from "lucide-react";
import { Avatar, displayName } from "@/components/ui/avatar";
import { formatMeetup, relativeDay } from "@/lib/dates";
import type { Member, Resource, Round } from "@/lib/data";

export function DueStamp({
  meetupAt,
  timezone,
  fresh,
}: {
  meetupAt: string;
  timezone: string;
  fresh?: boolean;
}) {
  return (
    <div
      className={`stamp ${fresh ? "stamp-fresh" : ""} inline-block select-none rounded-md border-2 border-red bg-paper/90 px-2.5 py-1 text-left leading-tight text-red`}
    >
      <div className="text-sm font-semibold">Due {relativeDay(meetupAt, timezone)}</div>
      <div className="text-sm">{formatMeetup(meetupAt, timezone)}</div>
    </div>
  );
}

export function Handout({
  round,
  hostName,
  timezone,
  fresh,
}: {
  round: Pick<Round, "number" | "topic_title" | "why" | "meetup_at">;
  hostName: string;
  timezone: string;
  fresh?: boolean;
}) {
  return (
    <article
      aria-label={`Week ${round.number} assignment`}
      className="paper-ruled relative rounded-md border border-rule/80 py-6 pr-5 pl-12 shadow-paper"
    >
      <p className="text-sm text-pencil">
        Set by <span className="font-semibold text-ink">{hostName}</span>, week {round.number}
      </p>

      <h1 className="mt-2 font-serif text-4xl leading-[1.12] text-ink">
        {round.topic_title}
      </h1>

      {round.why ? (
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-ink">
          <span className="font-semibold">Why: </span>
          {round.why}
        </p>
      ) : null}

      {round.meetup_at ? (
        <div className="mt-6 flex justify-end">
          <DueStamp meetupAt={round.meetup_at} timezone={timezone} fresh={fresh} />
        </div>
      ) : null}
    </article>
  );
}

const KIND_ICON = {
  read: BookOpen,
  watch: Play,
  listen: Headphones,
  other: Link2,
} as const;

const KIND_VERB = {
  read: "read",
  watch: "watch",
  listen: "listen",
  other: "open",
} as const;

export function ResourceList({ resources }: { resources: readonly Resource[] }) {
  if (resources.length === 0) {
    return (
      <p className="text-base text-pencil">
        No links attached for this week. Bring whatever you read or watched on your own.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rule/70">
      {resources.map((res) => {
        const Icon = KIND_ICON[res.kind] ?? Link2;
        const verb = KIND_VERB[res.kind] ?? "open";
        const meta = res.minutes ? `${verb}, ${res.minutes}m` : verb;
        return (
          <li key={res.id}>
            <a
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-12 items-center justify-between gap-3 py-3 text-left transition-colors hover:text-ink-soft"
            >
              <span className="flex min-w-0 items-baseline gap-2.5">
                <Icon aria-hidden className="size-4 shrink-0 translate-y-0.5 text-pencil" />
                <span className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 group-hover:decoration-ink">
                  {res.label}
                </span>
                <span className="shrink-0 text-sm text-pencil">({meta})</span>
              </span>
              <ExternalLink aria-hidden className="size-4 shrink-0 text-pencil" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function AvatarRow({
  members,
  doneIds,
}: {
  members: readonly Member[];
  doneIds: ReadonlySet<string>;
}) {
  const done = members.filter((m) => doneIds.has(m.user_id));
  const pending = members.filter((m) => !doneIds.has(m.user_id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {done.map((m) => {
          const name = displayName(m.profile);
          return (
            <div key={m.user_id} className="flex items-center gap-2">
              <span className="relative inline-flex">
                <Avatar profile={m.profile} size="md" ring />
                <span
                  aria-hidden
                  className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-red text-paper"
                >
                  <Check className="size-3.5 stroke-[3]" />
                </span>
              </span>
              <span className="highlighted px-1 font-semibold text-ink">{name}</span>
            </div>
          );
        })}

        {pending.map((m) => {
          const name = displayName(m.profile);
          return (
            <div key={m.user_id} className="flex items-center gap-2 opacity-75">
              <Avatar profile={m.profile} size="md" />
              <span className="text-pencil">{name}</span>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-pencil">
        {done.length === 0
          ? "Nobody has checked in yet."
          : done.length === members.length
            ? `All ${members.length} of you did the homework.`
            : `${done.length} of ${members.length} done with the homework.`}
      </p>
    </div>
  );
}
