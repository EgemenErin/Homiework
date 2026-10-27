import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Welcome to Homiework",
};

async function LoginBody({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next, "/home");

  return (
    <div className="flex flex-1 flex-col">
      {params.error ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red bg-red-wash px-3.5 py-2.5 text-sm text-red"
        >
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
    <div className="flex min-h-dvh flex-col bg-desk text-ink overflow-x-hidden">
      <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col px-5 pt-4 pb-8">
        <Suspense
          fallback={
            <p className="py-12 text-center text-base text-pencil">
              Loading…
            </p>
          }
        >
          <LoginBody searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
