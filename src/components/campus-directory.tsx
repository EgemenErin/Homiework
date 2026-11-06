"use client";

import { GraduationCap, Search } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { joinGroup, searchCampusGroups } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import type { CampusGroupMatch } from "@/lib/data";
import { WEEKDAYS } from "@/lib/dates";
import { triggerHaptic } from "@/lib/haptics";

export function CampusClubsDirectory({
  initialClubs,
}: {
  initialClubs: readonly CampusGroupMatch[];
}) {
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<readonly CampusGroupMatch[]>(initialClubs);
  const [pending, startTransition] = useTransition();

  function handleSearch(nextQuery: string) {
    setQuery(nextQuery);
    startTransition(async () => {
      const results = await searchCampusGroups(nextQuery);
      setClubs(results);
    });
  }

  return (
    <div className="space-y-4 rounded-md border border-rule bg-desk-deep/60 p-4">
      <div className="flex items-start gap-2.5">
        <GraduationCap aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" />
        <div>
          <h3 className="text-base font-semibold text-ink">
            University Clubs &amp; Campus Circles
          </h3>
          <p className="text-sm text-pencil">
            Find open study circles at your university and join for free.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-3.5 left-3 size-4 text-pencil"
        />
        <input
          type="search"
          aria-label="Search by university or club name"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search university (e.g. TU Berlin, Columbia...)"
          className={`${inputClass} pl-9`}
        />
      </div>

      {clubs.length === 0 ? (
        <p className="py-2 text-sm text-pencil">
          {pending
            ? "Searching campus circles…"
            : "No public campus circles matched that search yet. Start one below and list it for your school!"}
        </p>
      ) : (
        <ul className="divide-y divide-rule/80 border-t border-rule pt-2">
          {clubs.map((c) => (
            <li
              key={c.group_id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-rule bg-paper px-1.5 py-0.5 text-xs font-semibold text-ink">
                    {c.university_name}
                  </span>
                  <span className="font-semibold text-ink">
                    {c.group_name}
                  </span>
                </div>
                <p className="text-sm text-pencil">
                  {c.member_count} {c.member_count === 1 ? "member" : "members"} ·{" "}
                  {WEEKDAYS[c.meet_weekday]}s at {String(c.meet_time).slice(0, 5)}
                </p>
              </div>

              {c.already_member ? (
                <Link
                  href={`/g/${c.group_id}`}
                  className="inline-flex min-h-9 items-center rounded-md border border-rule bg-paper px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink"
                >
                  Open circle
                </Link>
              ) : (
                <form
                  action={async (fd) => {
                    triggerHaptic("success");
                    await joinGroup(null, fd);
                  }}
                >
                  <input type="hidden" name="code" value={c.invite_code} />
                  <Button type="submit" variant="secondary" size="md">
                    Join circle
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
