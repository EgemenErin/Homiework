"use client";

import { ChevronDown, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/data";

export function GroupTopBar({
  currentGroupId,
  currentGroupName,
  groups,
  profile,
}: {
  currentGroupId: string;
  currentGroupName: string;
  groups: readonly { id: string; name: string }[];
  profile: Profile | null;
}) {
  const router = useRouter();

  function handleSwitch(value: string) {
    if (value === "__new__") {
      router.push("/onboarding");
    } else if (value && value !== currentGroupId) {
      router.push(`/g/${value}`);
    }
  }

  return (
    <header className="border-b border-rule/80 bg-desk/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[34rem] items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/g/${currentGroupId}`}
            aria-label="Homiework"
            className="inline-flex min-h-11 shrink-0 items-center"
          >
            <Image
              src="/brand/wordmark.png"
              alt="Homiework"
              width={136}
              height={30}
              priority
              className="h-6 w-auto"
            />
          </Link>

          <div className="relative flex min-w-0 items-center">
            <label htmlFor="group-switcher" className="sr-only">
              Switch group
            </label>
            <select
              id="group-switcher"
              value={currentGroupId}
              onChange={(e) => handleSwitch(e.target.value)}
              className="min-h-11 max-w-44 appearance-none truncate rounded-md border border-rule bg-desk-deep py-1.5 pr-7 pl-2.5 text-sm font-semibold text-ink hover:border-ink/60"
            >
              {groups.length > 0 ? (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))
              ) : (
                <option value={currentGroupId}>{currentGroupName}</option>
              )}
              <option value="__new__">+ New or join group…</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2 size-4 text-pencil"
            />
          </div>
        </div>

        <Link
          href={`/me?from=${encodeURIComponent(`/g/${currentGroupId}`)}`}
          aria-label="Your profile and settings"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
        >
          {profile ? (
            <Avatar profile={profile} size="sm" />
          ) : (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
              Me
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

export function TabBar({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;

  const tabs = [
    {
      href: base,
      label: "This week",
      active:
        pathname === base ||
        pathname === `${base}/assign` ||
        pathname === `${base}/close`,
    },
    {
      href: `${base}/backlog`,
      label: "Backlog",
      active: pathname.startsWith(`${base}/backlog`),
    },
    {
      href: `${base}/crew`,
      label: "Crew",
      active: pathname.startsWith(`${base}/crew`),
    },
    {
      href: `/me?from=${encodeURIComponent(base)}`,
      label: "Me",
      active: pathname.startsWith("/me"),
    },
  ];

  return (
    <nav
      aria-label="Group navigation"
      className="border-b border-rule bg-desk"
    >
      <ul className="mx-auto grid max-w-[34rem] grid-cols-4 px-2">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`relative flex min-h-11 items-center justify-center px-2 text-base transition-colors ${
                tab.active
                  ? "font-semibold text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-red"
                  : "text-pencil hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SimpleHeader({ backHref, backLabel = "Back" }: { backHref?: string; backLabel?: string }) {
  return (
    <header className="border-b border-rule/80 bg-desk">
      <div className="mx-auto flex max-w-[34rem] items-center justify-between px-4 py-3">
        <Link href="/home" aria-label="Homiework" className="inline-flex min-h-11 items-center">
          <Image
            src="/brand/wordmark.png"
            alt="Homiework"
            width={136}
            height={30}
            priority
            className="h-6 w-auto"
          />
        </Link>
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
          >
            {backLabel}
          </Link>
        ) : (
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-pencil hover:text-ink"
          >
            <Plus aria-hidden className="size-4" />
            New group
          </Link>
        )}
      </div>
    </header>
  );
}
