import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getOverdueAutoSessions,
  updateStudySession,
  updateSyllabusTopic,
  getSyllabi,
  getSyllabusById,
  getStudySessions,
  createStudySession,
} from "@/lib/db";
import { generateAutoSchedule } from "@/lib/scheduler";

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

    // 1. Detect overdue auto-generated planned sessions
    const overdueSessions = await getOverdueAutoSessions(session.workspace_id);
    if (overdueSessions.length === 0) {
      return NextResponse.json({
        success: true,
        overdueCount: 0,
        replannedCount: 0,
        message: "Jadwal belajar sudah mutakhir. Tidak ada sesi otomatis yang terlewat.",
      });
    }

    // 2. Mark overdue sessions as 'cancelled' and ensure topic remains 'not_started'
    const affectedTopicIds = new Set<string>();
    for (const s of overdueSessions) {
      await updateStudySession(s.id, session.workspace_id, { status: "cancelled" });
      if (s.topic_id) {
        affectedTopicIds.add(s.topic_id);
        await updateSyllabusTopic(s.topic_id, { status: "not_started" }, session.workspace_id);
      }
    }

    // 3. Re-run scheduling for affected syllabi
    let replannedCount = 0;
    const allSyllabi = await getSyllabi(session.workspace_id);
    const existingSessions = await getStudySessions(session.workspace_id);

    for (const syl of allSyllabi) {
      const fullSyllabus = await getSyllabusById(syl.id, session.workspace_id);
      if (!fullSyllabus || !fullSyllabus.topics) continue;

      const hasAffectedTopic = fullSyllabus.topics.some((t) => affectedTopicIds.has(t.id));
      if (!hasAffectedTopic) continue;

      // Plan future slots for pending topics
      const plan = generateAutoSchedule(
        fullSyllabus.topics,
        fullSyllabus.deadline,
        existingSessions
      );

      for (const item of plan.scheduledSessions) {
        // Only schedule if it was one of the affected/pending topics
        if (affectedTopicIds.has(item.topic_id)) {
          await createStudySession({
            workspace_id: session.workspace_id,
            subject_id: fullSyllabus.subject_id,
            topic_id: item.topic_id,
            title: `Belajar: ${item.topic_title}`,
            start_time: item.start_time,
            duration_minutes: item.duration_minutes,
            status: "planned",
            source: "auto_generated",
          });
          await updateSyllabusTopic(item.topic_id, { status: "in_progress" }, session.workspace_id);
          replannedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      overdueCount: overdueSessions.length,
      replannedCount,
      message: `${overdueSessions.length} sesi terlewat berhasil dijadwalkan ulang ke slot luang berikutnya.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menjadwalkan ulang: " + message }, { status: 500 });
  }
}
