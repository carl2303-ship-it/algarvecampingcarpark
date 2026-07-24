import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export async function middleware(request: NextRequest) {
  // Collapse accidental "//path" (e.g. SITE_URL with trailing slash in emails)
  // so the App Router never sees a protocol-relative path like "//stay/...".
  const rawPathname = request.nextUrl.pathname;
  if (rawPathname.includes("//")) {
    const url = request.nextUrl.clone();
    url.pathname = rawPathname.replace(/\/{2,}/g, "/");
    return NextResponse.redirect(url, 308);
  }

  if (!rawPathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = rawPathname;
  const isPublicAdminPage = PUBLIC_ADMIN_PATHS.has(pathname);
  const isLoginPage = pathname === "/admin/login";

  if (!user && !isPublicAdminPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (user && user.app_metadata?.role !== "admin" && !isPublicAdminPage) {
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on admin + all page routes so "//stay/..." email links get normalized.
     * Skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|logos/|.*\\..*).*)",
  ],
};
