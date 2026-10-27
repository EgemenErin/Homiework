import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { createLocalDemoClient, isLocalDemoMode } from "./local-store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "local-demo";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  await connection();
  if (isLocalDemoMode()) {
    return (await createLocalDemoClient(false)) as unknown as ReturnType<
      typeof createServerClient<Database>
    >;
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Service-role client for server-only jobs (push fan-out, cron reminders).
 * Bypasses RLS: never pass user input into it without checking membership first.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
