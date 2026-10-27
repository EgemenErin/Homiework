import type { Metadata } from "next";
import { Suspense } from "react";
import { displayName } from "@/components/ui/avatar";
import { getBacklog, requireUser } from "@/lib/data";
import { AddSuggestionForm, SuggestionRow } from "./backlog-client";

export const metadata: Metadata = {
  title: "Topic backlog",
};

async function BacklogContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireUser(`/g/${groupId}/backlog`);
  const { userId, open, used, round } = await getBacklog(groupId);
  const canPick = Boolean(round && round.host_id === userId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-ink">Topic backlog</h1>
        <p className="mt-1 text-base text-pencil">
          Drop ideas here anytime. When it is your turn to host, grab the top-voted one or pick your own.
        </p>
      </div>

      <AddSuggestionForm groupId={groupId} />

      <section aria-labelledby="ideas-heading" className="space-y-2">
        <h2 id="ideas-heading" className="text-lg font-semibold text-ink">
          Ideas ({open.length})
        </h2>

        {open.length === 0 ? (
          <p className="py-4 text-base text-pencil">
            Nothing here yet. Add something you&apos;d like the group to learn.
          </p>
        ) : (
          <ul className="divide-y divide-rule/80">
            {open.map((s) => (
              <SuggestionRow
                key={s.id}
                id={s.id}
                groupId={groupId}
                title={s.title}
                pitch={s.pitch}
                authorName={displayName(s.author)}
                initialVotes={s.votes}
                initialVoted={s.votedByMe}
                isMine={s.author_id === userId}
                canPickForThisWeek={canPick}
              />
            ))}
          </ul>
        )}
      </section>

      {used.length > 0 ? (
        <section
          aria-labelledby="used-heading"
          className="space-y-2 border-t border-rule pt-8"
        >
          <h2 id="used-heading" className="text-sm font-semibold text-pencil">
            Already studied
          </h2>
          <ul className="divide-y divide-rule/60 text-base text-pencil">
            {used.map((s) => (
              <li key={s.id} className="py-2.5 line-through">
                {s.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function BacklogPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-base text-pencil">Loading backlog…</p>}
    >
      <BacklogContent params={params} />
    </Suspense>
  );
}
