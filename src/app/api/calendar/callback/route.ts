import { NextRequest, NextResponse } from "next/server";
import { getSession, saveCalendarConnection } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

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

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      console.warn("Calendar callback error or denied:", error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/calendar?error=${encodeURIComponent(error || "access_denied")}`, req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await saveCalendarConnection({
      workspace_id: session.workspace_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      sync_mode: "two_way",
    });

    return NextResponse.redirect(
      new URL("/dashboard/settings/calendar?connected=true", req.url)
    );
  } catch (error: unknown) {
    console.error("Calendar callback exception:", error);
    const message = error instanceof Error ? error.message : "Kesalahan koneksi";
    return NextResponse.redirect(
      new URL(`/dashboard/settings/calendar?error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
