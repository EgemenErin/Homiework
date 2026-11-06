export type CalendarEventInput = {
  roundId: string;
  roundNumber: number;
  groupName: string;
  topicTitle: string;
  why: string | null;
  meetupAtIso: string;
  meetupPlace: string | null;
  resources: readonly { label: string; url: string }[];
  groupUrl?: string;
};

function toIcsUtcTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function buildDescription(event: CalendarEventInput): string {
  const lines: string[] = [
    `${event.groupName} — Week ${event.roundNumber} Study Meetup`,
    `Topic: ${event.topicTitle}`,
  ];
  if (event.why) {
    lines.push("", `Why it matters: ${event.why}`);
  }
  if (event.resources.length > 0) {
    lines.push("", "Homework links:");
    for (const r of event.resources) {
      lines.push(`• ${r.label}: ${r.url}`);
    }
  }
  if (event.groupUrl) {
    lines.push("", `Open handout: ${event.groupUrl}`);
  }
  return lines.join("\n");
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const start = new Date(event.meetupAtIso);
  const end = new Date(start.getTime() + 90 * 60_000); // 90-minute default study meetup
  const dates = `${toIcsUtcTimestamp(start)}/${toIcsUtcTimestamp(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.groupName}: ${event.topicTitle}`,
    dates,
    details: buildDescription(event),
    location: event.meetupPlace || "See group handout",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event: CalendarEventInput): string {
  const start = new Date(event.meetupAtIso);
  const end = new Date(start.getTime() + 90 * 60_000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `${event.groupName}: ${event.topicTitle}`,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: buildDescription(event),
    location: event.meetupPlace || "See group handout",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildIcsCalendar(
  groupName: string,
  events: readonly CalendarEventInput[],
): string {
  const stamp = toIcsUtcTimestamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Homiework//Weekly Study Club//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(groupName)} (Homiework)`,
  ];

  for (const ev of events) {
    const start = new Date(ev.meetupAtIso);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + 90 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:round-${ev.roundId}@homiework.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsUtcTimestamp(start)}`,
      `DTEND:${toIcsUtcTimestamp(end)}`,
      `SUMMARY:${escapeIcsText(`${ev.groupName} (Week ${ev.roundNumber}): ${ev.topicTitle}`)}`,
      `DESCRIPTION:${escapeIcsText(buildDescription(ev))}`,
      `LOCATION:${escapeIcsText(ev.meetupPlace || "Group meetup")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
