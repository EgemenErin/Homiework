import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";
  const next = safeNext(
    searchParams.get("redirect_to") ?? searchParams.get("next"),
    "/home",
  );

  const dest = request.nextUrl.clone();

  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const [pathname, query] = next.split("?");
      dest.pathname = pathname;
      dest.search = query ? `?${query}` : "";
      return NextResponse.redirect(dest);
    }
  }

  dest.pathname = "/login";
  dest.search = `?error=${encodeURIComponent(
    "That sign-in link has expired. Ask for a new code below.",
  )}&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(dest);
}
