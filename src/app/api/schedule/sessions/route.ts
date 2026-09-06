import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudySessions, createStudySession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const sessions = await getStudySessions(session.workspace_id, startDate, endDate);
    return NextResponse.json({ success: true, sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat sesi belajar: " + message }, { status: 500 });
  }
}

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

    const body = await req.json().catch(() => ({}));
    const { subject_id, title, start_time, duration_minutes, status, source } = body;

    if (!subject_id || typeof subject_id !== "string") {
      return NextResponse.json({ error: "Mata pelajaran wajib dipilih." }, { status: 400 });
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Judul sesi belajar wajib diisi." }, { status: 400 });
    }

    if (!start_time || isNaN(new Date(start_time).getTime())) {
      return NextResponse.json({ error: "Waktu mulai tidak valid." }, { status: 400 });
    }

    const duration = typeof duration_minutes === "number" && duration_minutes > 0 ? duration_minutes : 60;
    const validStatuses = ["planned", "in_progress", "completed", "cancelled"];
    const sessionStatus = validStatuses.includes(status) ? status : "planned";

    const newSession = await createStudySession({
      workspace_id: session.workspace_id,
      subject_id,
      title: title.trim(),
      start_time,
      duration_minutes: duration,
      status: sessionStatus,
      source: source || "manual",
    });

    return NextResponse.json({
      success: true,
      message: `Sesi "${newSession.title}" berhasil dijadwalkan.`,
      session: newSession,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menjadwalkan sesi belajar: " + message }, { status: 500 });
  }
}
