import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { safeNext } from "@/lib/actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

async function LoginBody({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next, "/home");

  return (
    <div className="space-y-6">
      {params.error ? (
        <p role="alert" className="rounded-md border border-red bg-red-wash px-3.5 py-2.5 text-sm text-red">
          {params.error}
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="min-h-dvh bg-desk text-ink">
      <header className="border-b border-rule/80">
        <div className="mx-auto flex max-w-[34rem] items-center justify-between px-4 py-3.5">
          <Link href="/" aria-label="Homiework" className="inline-flex min-h-11 items-center">
            <Image
              src="/brand/wordmark.png"
              alt="Homiework"
              width={142}
              height={31}
              priority
              className="h-6 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[34rem] px-4 pt-10 pb-20">
        <h1 className="font-serif text-2xl text-ink">Sign in to Homiework</h1>
        <p className="mt-2 text-base text-pencil">
          Enter your email to get into your group or start a new one.
        </p>

        <div className="mt-8">
          <Suspense fallback={<p className="text-base text-pencil">Loading sign-in…</p>}>
            <LoginBody searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
