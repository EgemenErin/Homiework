import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";

/**
 * Next occurrence of the group's usual meetup slot, strictly after `now` plus
 * `minLeadHours`, in the group's timezone. Weekday: 0 = Sunday … 6 = Saturday.
 */
export function nextMeetupDefault(
  weekday: number,
  time: string,
  timezone: string,
  now: Date = new Date(),
  minLeadHours = 24,
): Date {
  const [h, m] = time.split(":").map(Number);
  const local = new TZDate(now.getTime(), timezone);
  for (let i = 0; i < 15; i++) {
    const day = addDays(local, i);
    if (day.getDay() !== weekday) continue;
    const candidate = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, timezone);
    if (candidate.getTime() - now.getTime() >= minLeadHours * 3_600_000) {
      return new Date(candidate.getTime());
    }
  }
  // Unreachable with a valid weekday, but keep a sane fallback.
  return new Date(now.getTime() + 7 * 86_400_000);
}

/** "Thu 30 Oct, 19:00" in the given timezone. */
export function formatMeetup(date: Date | string, timezone: string): string {
  return format(new TZDate(new Date(date).getTime(), timezone), "EEE d MMM, HH:mm");
}

/** "Thursday 30 October" */
export function formatDayLong(date: Date | string, timezone: string): string {
  return format(new TZDate(new Date(date).getTime(), timezone), "EEEE d MMMM");
}

/** "19:00" */
export function formatTime(date: Date | string, timezone: string): string {
  return format(new TZDate(new Date(date).getTime(), timezone), "HH:mm");
}

/** Value for <input type="datetime-local"> showing `date` in `timezone`. */
export function toDateTimeLocal(date: Date | string, timezone: string): string {
  return format(new TZDate(new Date(date).getTime(), timezone), "yyyy-MM-dd'T'HH:mm");
}

/** Parse a datetime-local value as wall-clock time in `timezone`. */
export function fromDateTimeLocal(value: string, timezone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const result = new TZDate(y, mo - 1, d, h, mi, 0, timezone);
  return Number.isNaN(result.getTime()) ? null : new Date(result.getTime());
}

/** "in 3 days", "tomorrow", "today", "2 days ago" relative to now, by calendar day in tz. */
export function relativeDay(date: Date | string, timezone: string, now: Date = new Date()): string {
  const key = (t: Date) => format(new TZDate(t.getTime(), timezone), "yyyy-MM-dd");
  const a = new Date(`${key(new Date(date))}T00:00:00Z`).getTime();
  const b = new Date(`${key(now)}T00:00:00Z`).getTime();
  const diff = Math.round((a - b) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
