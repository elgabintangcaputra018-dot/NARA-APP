import { NextRequest, NextResponse } from "next/server";
import { getSession, updateStudySession, deleteStudySession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
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

    const sessionId = params.id;
    const body = await req.json().catch(() => ({}));
    const { title, start_time, duration_minutes, status, subject_id } = body;

    const updateData: Record<string, unknown> = {};
    if (title && typeof title === "string") updateData.title = title.trim();
    if (start_time && !isNaN(new Date(start_time).getTime())) updateData.start_time = start_time;
    if (typeof duration_minutes === "number" && duration_minutes > 0) updateData.duration_minutes = duration_minutes;
    if (status && ["planned", "in_progress", "completed", "cancelled"].includes(status)) updateData.status = status;
    if (subject_id && typeof subject_id === "string") updateData.subject_id = subject_id;

    const updated = await updateStudySession(sessionId, session.workspace_id, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Sesi belajar tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Sesi belajar berhasil diperbarui.",
      session: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui sesi belajar: " + message }, { status: 500 });
  }
}

export async function DELETE(
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

    const sessionId = params.id;
    const deleted = await deleteStudySession(sessionId, session.workspace_id);

    if (!deleted) {
      return NextResponse.json({ error: "Sesi belajar tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Sesi belajar berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus sesi belajar: " + message }, { status: 500 });
  }
}
