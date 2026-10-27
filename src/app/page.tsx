import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/data";

async function AuthCheck() {
  const user = await getUser();
  if (user) {
    redirect("/home");
  }
  return null;
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-desk text-ink px-5 pt-4 pb-6">
      <Suspense fallback={null}>
        <AuthCheck />
      </Suspense>

      {/* Top brand header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/book-mark.png"
            alt=""
            width={24}
            height={31}
            priority
            className="h-7 w-auto"
          />
          <span className="text-sm font-semibold text-pencil">
            Weekly study club
          </span>
        </div>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink active:scale-95 transition-transform"
        >
          Sign in
        </Link>
      </header>

      {/* Center mobile app welcome + authentic assignment handout preview */}
      <main className="my-auto py-3 space-y-4">
        <section aria-labelledby="hero-heading">
          <Image
            src="/brand/wordmark.png"
            alt="Homiework"
            width={180}
            height={38}
            priority
            className="mb-3 h-8 w-auto"
          />
          <h1
            id="hero-heading"
            className="font-serif text-2xl leading-tight text-ink"
          >
            One topic a week, picked by one of your friends.
          </h1>
          <p className="mt-1 text-base leading-snug text-pencil">
            Do the homework on your own, then meet up and talk it out.
          </p>
        </section>

        {/* The assignment handout card */}
        <article
          aria-label="Sample weekly assignment"
          className="paper-ruled relative rounded-md border border-rule/90 py-5 pr-4 pl-11 shadow-paper"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-pencil">
              Set by <span className="font-semibold text-ink">Kerem</span> · Week 3
            </p>
            <span className="highlighted px-1.5 text-xs font-semibold text-ink">
              3/5 done
            </span>
          </div>

          <h2 className="mt-2 font-serif text-xl leading-snug text-ink">
            How does the Federal Reserve set interest rates?
          </h2>

          <p className="mt-1.5 text-sm leading-snug text-pencil">
            We keep arguing about inflation—let&apos;s learn how rates actually get decided.
          </p>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="text-xs text-pencil">
              <div className="font-semibold text-ink">Thu 30 Oct, 19:00</div>
              <div>Kerem&apos;s place</div>
            </div>

            <div className="stamp inline-block select-none rounded-md border-2 border-red bg-paper/95 px-2.5 py-0.5 text-left leading-tight text-red">
              <div className="text-xs font-semibold">Due Thursday</div>
              <div className="text-xs">19:00</div>
            </div>
          </div>
        </article>
      </main>

      {/* Pinned mobile action dock */}
      <footer className="space-y-2 pt-2">
        <ButtonLink
          href="/login?next=/onboarding"
          variant="primary"
          size="lg"
          className="w-full"
        >
          Start a group
        </ButtonLink>
        <ButtonLink
          href="/login?next=/onboarding%23join"
          variant="secondary"
          size="md"
          className="w-full"
        >
          I have an invite
        </ButtonLink>
      </footer>
    </div>
  );
}
