import { NextResponse, type NextRequest } from "next/server";
import { buildIcsCalendar, type CalendarEventInput } from "@/lib/calendar";
import { isUuid } from "@/lib/data";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  if (!isUuid(groupId)) {
    return new NextResponse("Invalid group ID", { status: 400 });
  }

  const roundFilter = request.nextUrl.searchParams.get("round");
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();

  // Fallback to admin client if subscribed via calendar client without session cookie
  const client = group ? supabase : createAdminClient();
  const groupRow =
    group ??
    (
      await client
        .from("groups")
        .select("id, name")
        .eq("id", groupId)
        .maybeSingle()
    ).data;

  if (!groupRow) {
    return new NextResponse("Group not found", { status: 404 });
  }

  const { data: rounds } = await client
    .from("rounds")
    .select("*")
    .eq("group_id", groupId)
    .order("number", { ascending: false })
    .limit(25);

  const validRounds = (rounds ?? []).filter(
    (r) =>
      r.topic_title &&
      r.meetup_at &&
      (!roundFilter || r.id === roundFilter),
  );

  const roundIds = validRounds.map((r) => r.id);
  const { data: allResources } =
    roundIds.length > 0
      ? await client
          .from("resources")
          .select("*")
          .in("round_id", roundIds)
          .order("sort")
      : { data: [] };

  const origin = request.nextUrl.origin;
  const events: CalendarEventInput[] = validRounds.map((r) => ({
    roundId: r.id,
    roundNumber: r.number,
    groupName: groupRow.name,
    topicTitle: r.topic_title ?? `Week ${r.number}`,
    why: r.why,
    meetupAtIso: r.meetup_at!,
    meetupPlace: r.meetup_place,
    resources: (allResources ?? [])
      .filter((res) => res.round_id === r.id)
      .map((res) => ({ label: res.label, url: res.url })),
    groupUrl: `${origin}/g/${groupRow.id}`,
  }));

  const icsBody = buildIcsCalendar(groupRow.name, events);
  const filename = roundFilter
    ? `homiework-week.ics`
    : `${groupRow.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-homiework.ics`;

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
