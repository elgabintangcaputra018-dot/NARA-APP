import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getSyllabusById,
  getStudySessions,
  createStudySession,
  updateSyllabusTopic,
} from "@/lib/db";
import { generateAutoSchedule } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const syllabus = await getSyllabusById(params.id, session.workspace_id);
    if (!syllabus) {
      return NextResponse.json({ error: "Silabus tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const apply = Boolean(body.apply);
    const studyHours = body.studyHours || { startHour: 16, endHour: 22 };

    // Fetch existing study sessions
    const existingSessions = await getStudySessions(session.workspace_id);

    // Run pure algorithmic auto-scheduler
    const plan = generateAutoSchedule(
      syllabus.topics || [],
      syllabus.deadline,
      existingSessions,
      { studyHours }
    );

    // If apply is requested, save sessions to database
    if (apply && plan.scheduledSessions.length > 0) {
      const createdSessions = [];

      for (const item of plan.scheduledSessions) {
        const created = await createStudySession({
          workspace_id: session.workspace_id,
          subject_id: syllabus.subject_id,
          topic_id: item.topic_id,
          title: `Belajar: ${item.topic_title}`,
          start_time: item.start_time,
          duration_minutes: item.duration_minutes,
          status: "planned",
          source: "auto_generated",
        });
        createdSessions.push(created);

        // Update topic to 'in_progress' if currently 'not_started'
        const currentTopic = (syllabus.topics || []).find((t) => t.id === item.topic_id);
        if (currentTopic && currentTopic.status === "not_started") {
          await updateSyllabusTopic(item.topic_id, { status: "in_progress" }, session.workspace_id);
        }
      }

      return NextResponse.json({
        success: true,
        applied: true,
        message: `${createdSessions.length} sesi belajar otomatis berhasil dijadwalkan ke kalender.`,
        plan,
        createdSessionsCount: createdSessions.length,
      });
    }

    // Preview only
    return NextResponse.json({
      success: true,
      applied: false,
      message: "Preview jadwal otomatis berhasil dibuat.",
      plan,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menyusun jadwal: " + message }, { status: 500 });
  }
}
