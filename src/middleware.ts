import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("nara_session")?.value;

  // Protect /dashboard and all child routes
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      const activateUrl = new URL("/activate", request.url);
      return NextResponse.redirect(activateUrl);
    }
  }

  // If visiting /login, redirect to /activate (or /dashboard if authenticated)
  if (pathname === "/login") {
    const targetUrl = sessionToken ? new URL("/dashboard", request.url) : new URL("/activate", request.url);
    return NextResponse.redirect(targetUrl);
  }

  // If already authenticated and visiting /activate, redirect to /dashboard
  if (pathname === "/activate") {
    if (sessionToken) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json
     * - sw.js
     * - icons
     * - mascot
     * - branding
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|mascot|branding).*)",
  ],
};
