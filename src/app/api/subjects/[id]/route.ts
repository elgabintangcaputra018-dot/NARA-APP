import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSubject, deleteSubject } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
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

    const subjectId = params.id;
    const body = await req.json().catch(() => ({}));
    const { name, priority, mode, color } = body;

    const updated = await updateSubject(subjectId, session.workspace_id, {
      ...(name ? { name: name.trim() } : {}),
      ...(priority ? { priority } : {}),
      ...(mode ? { mode } : {}),
      ...(color ? { color } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Mata pelajaran berhasil diperbarui.",
      subject: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui mata pelajaran: " + message }, { status: 500 });
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

    const subjectId = params.id;
    const deleted = await deleteSubject(subjectId, session.workspace_id);

    if (!deleted) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Mata pelajaran berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus mata pelajaran: " + message }, { status: 500 });
  }
}
