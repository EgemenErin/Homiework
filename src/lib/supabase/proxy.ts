import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PROTECTED = ["/g/", "/home", "/me", "/onboarding"];

/** Refreshes the Supabase session cookie and does optimistic auth redirects. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  let signedIn = false;

  if (!key || key === "local-demo") {
    signedIn = Boolean(request.cookies.get("hw_demo_uid")?.value);
  } else {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(headers ?? {}).forEach(([key, value]) =>
              response.headers.set(key, value),
            );
          },
        },
      },
    );

    // Nothing between client creation and this call: it refreshes the token.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    const [p, q] = path.split("?");
    url.pathname = p;
    url.search = q ? `?${q}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(p))) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
  if (signedIn && (pathname === "/" || pathname === "/login")) {
    const next = request.nextUrl.searchParams.get("next");
    return redirectTo(pathname === "/login" && next?.startsWith("/") && !next.startsWith("//") ? next : "/home");
  }

  return response;
}
