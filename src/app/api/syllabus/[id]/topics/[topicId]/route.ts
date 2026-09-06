import { NextRequest, NextResponse } from "next/server";
import { getSession, getSyllabusById, updateSyllabusTopic, deleteSyllabusTopic } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; topicId: string } }
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
    const { title, weight, estimated_minutes, status } = body;

    const updated = await updateSyllabusTopic(params.topicId, {
      title,
      weight,
      estimated_minutes,
      status,
    }, session.workspace_id);

    if (!updated) {
      return NextResponse.json({ error: "Topik silabus tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Topik berhasil diperbarui.",
      topic: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui topik: " + message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; topicId: string } }
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

    const deleted = await deleteSyllabusTopic(params.topicId, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Topik tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Topik berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus topik: " + message }, { status: 500 });
  }
}
