export type RotationMember = { user_id: string; rotation_position: number };

/** Members in rotation order. */
export function inRotationOrder<T extends RotationMember>(members: readonly T[]): T[] {
  return members.toSorted((a, b) => a.rotation_position - b.rotation_position);
}

/** Who hosts after `currentHostId`, wrapping to the start. Mirrors SQL `next_host`. */
export function nextHost<T extends RotationMember>(members: readonly T[], currentHostId: string | null): T | null {
  const ordered = inRotationOrder(members);
  if (ordered.length === 0) return null;
  const current = ordered.find((m) => m.user_id === currentHostId);
  if (!current) return ordered[0];
  return ordered.find((m) => m.rotation_position > current.rotation_position) ?? ordered[0];
}

/**
 * The upcoming host order starting with the current host, e.g. for "Up next".
 * Each member appears once.
 */
export function upcomingHosts<T extends RotationMember>(members: readonly T[], currentHostId: string | null): T[] {
  const ordered = inRotationOrder(members);
  const start = ordered.findIndex((m) => m.user_id === currentHostId);
  if (start <= 0) return ordered;
  return [...ordered.slice(start), ...ordered.slice(0, start)];
}
