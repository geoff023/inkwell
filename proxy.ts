import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

// Optimistic redirects only. Real authorisation happens in the data layer
// (lib/auth.ts) and in the database's RLS policies.
const PRIVATE_PREFIXES = ["/home", "/write", "/journal", "/library", "/saved", "/settings", "/onboarding"];
const GUEST_ONLY = ["/login", "/signup"];

const matches = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { response, userId } = await refreshSession(request);
  const path = request.nextUrl.pathname;
  // Keep any refreshed session cookies when redirecting.
  const redirect = (url: URL) => {
    const res = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (!userId && matches(path, PRIVATE_PREFIXES)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirect(url);
  }
  if (userId && matches(path, GUEST_ONLY)) {
    return redirect(new URL("/home", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
