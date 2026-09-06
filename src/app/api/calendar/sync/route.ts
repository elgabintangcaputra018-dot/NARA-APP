import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getCalendarConnection,
  getStudySessions,
  updateStudySession,
} from "@/lib/db";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

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

    if (connection.sync_mode === "read_only") {
      return NextResponse.json(
        {
          error:
            "Mode sinkronisasi saat ini adalah 'Hanya Baca' (Read-Only). Ubah ke 'Dua Arah' untuk dapat mengirim jadwal ke Google Calendar.",
        },
        { status: 400 }
      );
    }

    // Get planned sessions that don't have a calendar_event_id yet
    const allSessions = await getStudySessions(session.workspace_id);
    const unsyncedSessions = allSessions.filter(
      (s) => s.status === "planned" && !s.calendar_event_id
    );

    const syncedResults: Array<{ id: string; title: string; calendarEventId: string }> = [];

    for (const studySession of unsyncedSessions) {
      try {
        const subjectName = studySession.subject?.name || "Materi OSN";
        const summary = `[Nara] ${studySession.title} (${subjectName})`;
        const description = `Sesi belajar OSN bersama Nara.\nMata Pelajaran: ${subjectName}\nDurasi: ${studySession.duration_minutes} menit`;

        const result = await createGoogleCalendarEvent(connection.access_token, {
          summary,
          description,
          startTime: studySession.start_time,
          durationMinutes: studySession.duration_minutes,
        });

        await updateStudySession(studySession.id, session.workspace_id, {
          calendar_event_id: result.id,
        });

        syncedResults.push({
          id: studySession.id,
          title: studySession.title,
          calendarEventId: result.id,
        });
      } catch (err) {
        console.error(`Error syncing session ${studySession.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${syncedResults.length} sesi belajar ke Google Calendar.`,
      syncedCount: syncedResults.length,
      syncedSessions: syncedResults,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menyinkronkan kalender: " + message }, { status: 500 });
  }
}
