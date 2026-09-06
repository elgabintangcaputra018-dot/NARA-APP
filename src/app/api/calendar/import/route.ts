import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getCalendarConnection,
  getStudySessions,
} from "@/lib/db";
import {
  fetchGoogleCalendarEvents,
  detectScheduleConflicts,
} from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const connection = await getCalendarConnection(session.workspace_id);
    if (!connection || !connection.is_connected) {
      return NextResponse.json(
        { error: "Google Calendar belum terhubung. Silakan hubungkan terlebih dahulu di pengaturan." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const defaultEnd = new Date(now.getTime() + 30 * 86400000).toISOString();

    const timeMin = body.startDate || defaultStart;
    const timeMax = body.endDate || defaultEnd;

    // Fetch events from Google Calendar
    const events = await fetchGoogleCalendarEvents(connection.access_token, timeMin, timeMax);

    // Fetch existing study sessions in workspace
    const sessions = await getStudySessions(session.workspace_id, timeMin, timeMax);

    // Detect mathematical overlaps
    const conflicts = detectScheduleConflicts(sessions, events);

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${events.length} agenda Google Calendar.`,
      eventsCount: events.length,
      events,
      conflictsCount: conflicts.length,
      conflicts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal mengimpor Google Calendar: " + message }, { status: 500 });
  }
}
