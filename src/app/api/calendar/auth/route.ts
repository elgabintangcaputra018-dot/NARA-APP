import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";
import { getGoogleOAuthUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/activate", req.url));
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.redirect(new URL("/activate", req.url));
    }

    if (!isGoogleCalendarConfigured()) {
      // In development / local testing without Google Cloud Console credentials,
      // simulate instant successful connection by forwarding directly to callback with mock code!
      const callbackUrl = new URL("/api/calendar/callback", req.url);
      callbackUrl.searchParams.set("code", `mock_oauth_code_${Date.now()}`);
      callbackUrl.searchParams.set("state", session.workspace_id);
      return NextResponse.redirect(callbackUrl);
    }

    const authUrl = getGoogleOAuthUrl(session.workspace_id);
    return NextResponse.redirect(authUrl);
  } catch (error: unknown) {
    console.error("Calendar auth error:", error);
    return NextResponse.redirect(new URL("/dashboard/settings/calendar?error=auth_failed", req.url));
  }
}
