"use client";

import { BookOpen, Check, ChevronRight, Headphones, Play } from "lucide-react";
import { useState } from "react";

const TABS = [
  { id: "handout", label: "1. Handout" },
  { id: "homework", label: "2. Homework" },
  { id: "steps", label: "3. Rotation" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const HOMIES = [
  { name: "Kerem", bg: "bg-avatar-green", done: true },
  { name: "Aylin", bg: "bg-avatar-plum", done: true },
  { name: "Ege", bg: "bg-avatar-ink", done: true },
  { name: "Mert", bg: "bg-avatar-red", done: false },
  { name: "Selin", bg: "bg-avatar-ochre", done: false },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Start a group & send one link",
    detail: "Your friends join the weekly rotation in seconds.",
  },
  {
    n: "2",
    title: "Next homie in line picks the topic",
    detail: "One question plus 2–3 short reads, videos, or podcasts.",
  },
  {
    n: "3",
    title: "Check in when you finish",
    detail: "Names light up in yellow marker as people get ready.",
  },
  {
    n: "4",
    title: "Meet up, talk it out, pass the pen",
    detail: "Close the week and the next friend takes over.",
  },
] as const;

export function LandingPreview() {
  const [activeTab, setActiveTab] = useState<TabId>("handout");

  const currentIndex = TABS.findIndex((t) => t.id === activeTab);
  const nextTab = TABS[(currentIndex + 1) % TABS.length];

  return (
    <section aria-label="App preview" className=" flex flex-col gap-3">
      {/* Segmented mobile pill switcher */}
      <div
        role="tablist"
        aria-label="Preview screens"
        className="grid grid-cols-3 rounded-md border border-rule bg-desk-deep p-1"
      >
        {TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-9 rounded-md px-2 text-sm font-semibold ${
                selected
                  ? "bg-paper text-ink shadow-2xs"
                  : "text-pencil hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Single focused card — only one view shown at a time */}
      {activeTab === "handout" ? (
        <article
          role="tabpanel"
          aria-label="Sample weekly handout"
          className="paper-ruled relative rounded-md border border-rule/90 py-5 pr-4 pl-11 shadow-paper"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-pencil">
              Set by <span className="font-semibold text-ink">Kerem</span> · Week 3
            </p>
            <span className="highlighted px-1.5 text-sm font-semibold text-ink">
              3/5 done
            </span>
          </div>

          <h2 className="mt-2 font-serif text-2xl leading-snug text-ink">
            How does the Federal Reserve set interest rates?
          </h2>

          <p className="mt-2 text-base leading-snug text-pencil">
            We keep arguing about inflation—let&apos;s learn how rates actually get decided.
          </p>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="text-sm text-pencil">
              <div className="font-semibold text-ink">Thu 30 Oct, 19:00</div>
              <div>Kerem&apos;s place</div>
            </div>

            <div className="stamp inline-block select-none rounded-md border-2 border-red bg-paper/95 px-2.5 py-1 text-left leading-tight text-red">
              <div className="text-sm font-semibold">Due Thursday</div>
              <div className="text-sm">19:00</div>
            </div>
          </div>
        </article>
      ) : null}

      {activeTab === "homework" ? (
        <article
          role="tabpanel"
          aria-label="Sample homework pack"
          className="rounded-md border border-rule/90 bg-paper p-4 shadow-paper"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg text-ink">This week&apos;s pack</h2>
            <span className="text-sm text-pencil">49 mins total</span>
          </div>

          <ul className="mt-2 divide-y divide-rule/70 text-base">
            <li className="flex items-center gap-2.5 py-2.5">
              <BookOpen aria-hidden className="size-4 shrink-0 text-pencil" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                What the FOMC is &amp; how it votes
              </span>
              <span className="shrink-0 text-sm text-pencil">10m read</span>
            </li>
            <li className="flex items-center gap-2.5 py-2.5">
              <Headphones aria-hidden className="size-4 shrink-0 text-pencil" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                Planet Money on rate hikes
              </span>
              <span className="shrink-0 text-sm text-pencil">25m listen</span>
            </li>
            <li className="flex items-center gap-2.5 py-2.5">
              <Play aria-hidden className="size-4 shrink-0 text-pencil" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                How the Fed steers rates
              </span>
              <span className="shrink-0 text-sm text-pencil">14m watch</span>
            </li>
          </ul>

          <div className="mt-3 border-t border-rule/70 pt-3">
            <p className="text-sm text-pencil">Checked in for Thursday</p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {HOMIES.map((h) => (
                <div
                  key={h.name}
                  className={`flex items-center gap-1.5 text-sm ${
                    h.done ? "" : "opacity-65"
                  }`}
                >
                  <span className="relative inline-flex">
                    <span
                      aria-hidden
                      className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold text-paper ${h.bg}`}
                    >
                      {h.name.charAt(0)}
                    </span>
                    {h.done ? (
                      <span
                        aria-hidden
                        className="absolute -right-0.5 -bottom-0.5 inline-flex size-3.5 items-center justify-center rounded-full bg-red text-paper"
                      >
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      h.done
                        ? "highlighted px-1 font-semibold text-ink"
                        : "text-pencil"
                    }
                  >
                    {h.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>
      ) : null}

      {activeTab === "steps" ? (
        <article
          role="tabpanel"
          aria-label="How the weekly rotation works"
          className="rounded-md border border-rule/90 bg-paper p-4 shadow-paper"
        >
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-baseline gap-3">
                <span className="highlighted shrink-0 px-1.5 font-serif text-base text-ink">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-snug text-ink">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-snug text-pencil">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      ) : null}

      {/* Subtle footer control to cycle the preview card */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" aria-hidden>
          {TABS.map((t) => (
            <span
              key={t.id}
              className={`h-1.5 rounded-full ${
                t.id === activeTab ? "w-5 bg-ink" : "w-1.5 bg-rule"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActiveTab(nextTab.id)}
          className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-pencil hover:text-ink"
        >
          Next: {nextTab.label.slice(3)}
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </section>
  );
}
