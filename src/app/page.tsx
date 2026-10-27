import Image from "next/image";
import Link from "next/link";
import { LandingPreview } from "@/components/landing-preview";
import { ButtonLink } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-desk text-ink">
      <div className="mx-auto flex min-h-dvh max-w-[26rem] flex-col justify-between px-5 pt-3 pb-5">
        {/* Compact mobile app top bar */}
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
            className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Sign in
          </Link>
        </header>

        {/* Center mobile app welcome + single-card interactive preview */}
        <main className="my-auto py-2">
          <section aria-labelledby="hero-heading" className="mb-4">
            <Image
              src="/brand/wordmark.png"
              alt="Homiework"
              width={200}
              height={43}
              priority
              className="mb-3 h-9 w-auto"
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

          <LandingPreview />
        </main>

        {/* Pinned mobile bottom action dock */}
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
    </div>
  );
}
