import { BookOpen, Check, Headphones, Play } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

const SAMPLE_STEPS = [
  {
    n: "1",
    title: "Start a group and send the invite link.",
    body: "Pick your usual meetup day and time. Your friends join with one link and land in the rotation.",
  },
  {
    n: "2",
    title: "Each week the next person in line sets the topic and the meetup.",
    body: "A question worth arguing about, two or three things to read or watch, and where you are meeting.",
  },
  {
    n: "3",
    title: "Everyone checks in once they have done the homework.",
    body: "Names get highlighted as people finish so nobody shows up cold.",
  },
  {
    n: "4",
    title: "Meet up and talk it out. The turn passes on.",
    body: "Tick who showed up, close the week, and the next homie in line takes the pen.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-desk text-ink">
      <header className="border-b border-rule/80">
        <div className="mx-auto flex max-w-[34rem] items-center justify-between px-4 py-3.5">
          <span className="font-serif text-xl text-ink">Homiework</span>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[34rem] px-4 pt-8 pb-20">
        <section aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className="font-serif text-4xl leading-[1.12] text-ink"
          >
            One topic a week, picked by one of your friends.
          </h1>
          <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-pencil">
            Everyone does the homework. Then you meet up and talk about it.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink href="/login?next=/onboarding" variant="primary" size="lg">
              Start a group
            </ButtonLink>
            <ButtonLink
              href="/login?next=/onboarding%23join"
              variant="tertiary"
              size="md"
            >
              I have an invite
            </ButtonLink>
          </div>
        </section>

        {/* The handout itself: the one paper object on the desk */}
        <section aria-label="Sample weekly assignment" className="mt-10">
          <article className="paper-ruled relative rounded-md border border-rule/80 py-6 pr-5 pl-12 shadow-paper">
            <p className="text-sm text-pencil">
              Set by <span className="font-semibold text-ink">Kerem</span>, week 3
            </p>
            <h2 className="mt-2 font-serif text-2xl leading-snug text-ink">
              How does the Federal Reserve set interest rates?
            </h2>
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink">
              <span className="font-semibold">Why: </span>
              We keep arguing about inflation and none of us actually knows how the rate gets decided.
            </p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="space-y-1 text-sm text-pencil">
                <div className="font-semibold text-ink">Thu 30 Oct, 19:00</div>
                <div>Kerem&apos;s place</div>
              </div>
              <div className="stamp inline-block select-none rounded-md border-2 border-red bg-paper/90 px-2.5 py-1 text-left leading-tight text-red">
                <div className="text-sm font-semibold">Due Thursday</div>
                <div className="text-sm">19:00</div>
              </div>
            </div>
          </article>

          <div className="mt-6 space-y-2">
            <h3 className="text-base font-semibold text-ink">Homework</h3>
            <ul className="divide-y divide-rule/70 text-base">
              <li className="flex items-baseline gap-2.5 py-2.5">
                <BookOpen aria-hidden className="size-4 shrink-0 translate-y-0.5 text-pencil" />
                <span className="font-semibold text-ink">What the FOMC is and how it votes</span>
                <span className="text-sm text-pencil">(read, 10m)</span>
              </li>
              <li className="flex items-baseline gap-2.5 py-2.5">
                <Headphones aria-hidden className="size-4 shrink-0 translate-y-0.5 text-pencil" />
                <span className="font-semibold text-ink">Planet Money on rate hikes</span>
                <span className="text-sm text-pencil">(listen, 25m)</span>
              </li>
              <li className="flex items-baseline gap-2.5 py-2.5">
                <Play aria-hidden className="size-4 shrink-0 translate-y-0.5 text-pencil" />
                <span className="font-semibold text-ink">How the Fed steers rates, explained</span>
                <span className="text-sm text-pencil">(watch, 14m)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-base font-semibold text-ink">Who&apos;s done</h3>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { name: "Kerem", bg: "bg-avatar-green", done: true },
                { name: "Aylin", bg: "bg-avatar-plum", done: true },
                { name: "Ege", bg: "bg-avatar-ink", done: true },
                { name: "Mert", bg: "bg-avatar-red", done: false },
                { name: "Selin", bg: "bg-avatar-ochre", done: false },
              ].map((h) => (
                <div
                  key={h.name}
                  className={`flex items-center gap-2 ${h.done ? "" : "opacity-75"}`}
                >
                  <span className="relative inline-flex">
                    <span
                      aria-hidden
                      className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold text-paper ${h.bg} ${
                        h.done ? "ring-4 ring-highlight" : ""
                      }`}
                    >
                      {h.name.charAt(0)}
                    </span>
                    {h.done ? (
                      <span
                        aria-hidden
                        className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-red text-paper"
                      >
                        <Check className="size-3 stroke-[3]" />
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
        </section>

        {/* Sequence: How a week works */}
        <section aria-labelledby="how-heading" className="mt-16 border-t border-rule pt-10">
          <h2 id="how-heading" className="font-serif text-2xl text-ink">
            How a week works
          </h2>
          <p className="mt-2 max-w-[58ch] text-base text-pencil">
            Swap an hour of scrolling for one subject you all actually read up on before Friday night. De-brainrot your week with the people you already hang out with.
          </p>

          <ol className="mt-6 space-y-6">
            {SAMPLE_STEPS.map((s) => (
              <li key={s.n} className="flex items-baseline gap-4">
                <span className="highlighted shrink-0 px-1.5 font-serif text-lg text-ink">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 max-w-[56ch] text-base text-pencil">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cta-heading" className="mt-16 border-t border-rule pt-10">
          <h2 id="cta-heading" className="font-serif text-2xl text-ink">
            Put your group in rotation.
          </h2>
          <p className="mt-2 max-w-[54ch] text-base text-pencil">
            Takes a minute to set up. Free to use, works on any phone, and installs to your home screen.
          </p>
          <div className="mt-6">
            <ButtonLink href="/login?next=/onboarding" variant="primary" size="lg">
              Start a group
            </ButtonLink>
          </div>
        </section>
      </main>
    </div>
  );
}
