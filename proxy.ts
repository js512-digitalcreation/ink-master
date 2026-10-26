// Runs before every page. Next.js 16+: keep this file named proxy.ts.
// (On Next.js 15 or older, rename it to middleware.ts and the function to `middleware`.)
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  // Email confirmation links can land on any page with ?code=...
  // Send them to the callback so the login is completed.
  const { pathname, searchParams } = request.nextUrl;
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|sw.js|offline.html|icon.svg|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
