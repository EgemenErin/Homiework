export type ClosedRoundRecord = {
  id: string;
  number: number;
  closed_at: string;
};

/**
 * Computes a member's consecutive check-in streak across closed rounds since they joined,
 * plus attendance counts. Mirrors the SQL `member_stats` function.
 */
export function computeMemberStats(opts: {
  userId: string;
  joinedAt: string | Date;
  closedRounds: readonly ClosedRoundRecord[];
  checkinRoundIds: ReadonlySet<string>;
  attendanceByRound: ReadonlyMap<string, boolean>;
}): { streak: number; attended: number; held: number; checkins: number } {
  const joinedMs = new Date(opts.joinedAt).getTime();
  const eligible = opts.closedRounds
    .filter((r) => new Date(r.closed_at).getTime() >= joinedMs)
    .toSorted((a, b) => b.number - a.number);

  let streak = 0;
  let countingStreak = true;
  let checkins = 0;

  for (const round of eligible) {
    const did = opts.checkinRoundIds.has(round.id);
    if (did) {
      checkins += 1;
      if (countingStreak) streak += 1;
    } else {
      countingStreak = false;
    }
  }

  let attended = 0;
  let held = 0;
  for (const [, present] of opts.attendanceByRound) {
    held += 1;
    if (present) attended += 1;
  }

  return { streak, attended, held, checkins };
}
