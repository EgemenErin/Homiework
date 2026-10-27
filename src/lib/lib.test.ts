import { describe, expect, it } from "vitest";
import { fromDateTimeLocal, formatMeetup, nextMeetupDefault, relativeDay, toDateTimeLocal } from "./dates";
import { nextHost, upcomingHosts } from "./rotation";
import { computeMemberStats } from "./streaks";

describe("nextMeetupDefault", () => {
  it("picks the coming Thursday 19:00 in Berlin when it's more than a day away", () => {
    // Monday 26 Oct 2026, 12:00 UTC
    const now = new Date("2026-10-26T12:00:00Z");
    const d = nextMeetupDefault(4, "19:00", "Europe/Berlin", now);
    // Thursday 29 Oct 2026 19:00 CET = 18:00 UTC (DST ended 25 Oct)
    expect(d.toISOString()).toBe("2026-10-29T18:00:00.000Z");
  });

  it("skips to next week when the slot is less than 24h away", () => {
    // Thursday 29 Oct 2026, 10:00 UTC: today's 19:00 Berlin is only 8h away
    const now = new Date("2026-10-29T10:00:00Z");
    const d = nextMeetupDefault(4, "19:00", "Europe/Berlin", now);
    expect(d.toISOString()).toBe("2026-11-05T18:00:00.000Z");
  });

  it("handles DST changes (summer time in Berlin is UTC+2)", () => {
    const now = new Date("2026-07-06T08:00:00Z"); // Monday
    const d = nextMeetupDefault(4, "19:00", "Europe/Berlin", now);
    expect(d.toISOString()).toBe("2026-07-09T17:00:00.000Z");
  });
});

describe("datetime-local round trip", () => {
  it("parses and formats in the group's timezone", () => {
    const d = fromDateTimeLocal("2026-10-29T19:00", "Europe/Istanbul");
    expect(d?.toISOString()).toBe("2026-10-29T16:00:00.000Z");
    expect(toDateTimeLocal(d!, "Europe/Istanbul")).toBe("2026-10-29T19:00");
    expect(formatMeetup(d!, "Europe/Istanbul")).toBe("Thu 29 Oct, 19:00");
  });

  it("rejects garbage", () => {
    expect(fromDateTimeLocal("tomorrow", "UTC")).toBeNull();
  });
});

describe("relativeDay", () => {
  const now = new Date("2026-10-26T22:30:00Z"); // 23:30 in Berlin, Monday
  it("uses calendar days in the timezone", () => {
    expect(relativeDay("2026-10-27T06:00:00Z", "Europe/Berlin", now)).toBe("tomorrow");
    expect(relativeDay("2026-10-26T20:00:00Z", "Europe/Berlin", now)).toBe("today");
    expect(relativeDay("2026-10-29T18:00:00Z", "Europe/Berlin", now)).toBe("in 3 days");
  });
});

describe("rotation", () => {
  const members = [
    { user_id: "c", rotation_position: 2 },
    { user_id: "a", rotation_position: 0 },
    { user_id: "b", rotation_position: 1 },
  ];

  it("moves to the next position", () => {
    expect(nextHost(members, "a")?.user_id).toBe("b");
    expect(nextHost(members, "b")?.user_id).toBe("c");
  });

  it("wraps around to the start", () => {
    expect(nextHost(members, "c")?.user_id).toBe("a");
  });

  it("starts at the top when the host left the group", () => {
    expect(nextHost(members, "gone")?.user_id).toBe("a");
    expect(nextHost([], "a")).toBeNull();
  });

  it("lists upcoming hosts starting from the current one", () => {
    expect(upcomingHosts(members, "b").map((m) => m.user_id)).toEqual(["b", "c", "a"]);
    expect(upcomingHosts(members, null).map((m) => m.user_id)).toEqual(["a", "b", "c"]);
  });
});

describe("computeMemberStats", () => {
  const rounds = [
    { id: "r1", number: 1, closed_at: "2026-10-05T20:00:00Z" },
    { id: "r2", number: 2, closed_at: "2026-10-12T20:00:00Z" },
    { id: "r3", number: 3, closed_at: "2026-10-19T20:00:00Z" },
  ];

  it("counts consecutive recent check-ins until a miss", () => {
    const stats = computeMemberStats({
      userId: "u1",
      joinedAt: "2026-10-01T00:00:00Z",
      closedRounds: rounds,
      checkinRoundIds: new Set(["r1", "r3"]),
      attendanceByRound: new Map([
        ["r1", true],
        ["r2", false],
        ["r3", true],
      ]),
    });
    expect(stats).toEqual({ streak: 1, attended: 2, held: 3, checkins: 2 });
  });

  it("ignores rounds closed before the member joined", () => {
    const stats = computeMemberStats({
      userId: "u2",
      joinedAt: "2026-10-10T00:00:00Z",
      closedRounds: rounds,
      checkinRoundIds: new Set(["r2", "r3"]),
      attendanceByRound: new Map([
        ["r2", true],
        ["r3", true],
      ]),
    });
    expect(stats).toEqual({ streak: 2, attended: 2, held: 2, checkins: 2 });
  });
});
