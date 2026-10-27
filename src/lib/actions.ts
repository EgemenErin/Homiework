import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";

export type ActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | null;

// Messages raised by our own SQL functions are written for people; pass them through.
const USER_FACING_CODES = new Set(["42501", "22023", "P0002", "28000"]);

export function dbError(error: PostgrestError | null, fallback = "That didn't save. Check your connection and try again."): string {
  if (!error) return fallback;
  if (USER_FACING_CODES.has(error.code)) return error.message;
  if (error.code === "23505") return "That's already saved.";
  if (error.code === "23514") return "One of the fields is too long or in the wrong format.";
  console.error("[db]", error.code, error.message);
  return fallback;
}

export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export function safeNext(next: unknown, fallback = "/home") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}
