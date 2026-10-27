"use client";

import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/data";
import { triggerHaptic } from "@/lib/haptics";

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
    triggerHaptic("selection");
    if (value === "__new__") {
      router.push("/onboarding");
    } else if (value && value !== currentGroupId) {
      router.push(`/g/${value}`);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rule/80 bg-desk pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[34rem] items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/g/${currentGroupId}`}
            aria-label="Homiework"
            className="inline-flex min-h-11 shrink-0 items-center active:scale-95 transition-transform"
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
              className="min-h-10 max-w-44 appearance-none truncate rounded-full border border-rule bg-desk-deep py-1.5 pr-7 pl-3 text-xs font-semibold text-ink shadow-2xs hover:border-ink/60 active:bg-rule/40 transition-colors"
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
              className="pointer-events-none absolute right-2 size-3.5 text-pencil"
            />
          </div>
        </div>

        <Link
          href={`/me?from=${encodeURIComponent(`/g/${currentGroupId}`)}`}
          aria-label="Your profile and settings"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-95 transition-transform"
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
      icon: BookOpen,
      active:
        pathname === base ||
        pathname === `${base}/assign` ||
        pathname === `${base}/close`,
    },
    {
      href: `${base}/backlog`,
      label: "Backlog",
      icon: Bookmark,
      active: pathname.startsWith(`${base}/backlog`),
    },
    {
      href: `${base}/crew`,
      label: "Crew",
      icon: Users,
      active: pathname.startsWith(`${base}/crew`),
    },
    {
      href: `/me?from=${encodeURIComponent(base)}`,
      label: "Me",
      icon: User,
      active: pathname.startsWith("/me"),
    },
  ];

  return (
    <nav
      aria-label="Group navigation"
      className="fixed bottom-0 inset-x-0 mx-auto max-w-[430px] z-50 border-t border-rule bg-desk/95 backdrop-blur-md pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_20px_rgba(17,17,17,0.04)]"
    >
      <ul className="grid grid-cols-4 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                onClick={() => triggerHaptic("selection")}
                className={`relative flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-center transition-all select-none active:scale-95 ${
                  tab.active
                    ? "font-semibold text-ink"
                    : "text-pencil hover:text-ink"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    aria-hidden
                    className={`size-5 transition-transform duration-200 ${
                      tab.active ? "scale-105 stroke-[2.25] text-ink" : "stroke-[1.75]"
                    }`}
                  />
                  {tab.active ? (
                    <span
                      aria-hidden
                      className="animate-chip-pop absolute -top-1 -right-1 size-1.5 rounded-full bg-red"
                    />
                  ) : null}
                </div>
                <span className="text-[11px] leading-none tracking-tight">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SimpleHeader({
  backHref,
  backLabel = "Back",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule/80 bg-desk pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[34rem] items-center justify-between px-4 py-2">
        <div className="flex items-center">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center gap-1 -ml-2 px-2 text-base font-semibold text-ink active:scale-95 transition-transform select-none"
            >
              <ChevronLeft aria-hidden className="size-5 shrink-0" />
              <span>{backLabel}</span>
            </Link>
          ) : (
            <Link
              href="/home"
              aria-label="Homiework"
              className="inline-flex min-h-11 items-center active:scale-95 transition-transform"
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
          )}
        </div>

        {backHref ? (
          <Link
            href="/home"
            aria-label="Homiework"
            className="inline-flex min-h-11 items-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <Image
              src="/brand/wordmark.png"
              alt="Homiework"
              width={104}
              height={23}
              priority
              className="h-5 w-auto"
            />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
