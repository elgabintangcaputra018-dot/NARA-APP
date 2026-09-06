import { NextRequest, NextResponse } from "next/server";
import { getSession, getNoteById, updateNote, deleteNote } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
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

    const note = await getNoteById(params.id, session.workspace_id);
    if (!note) {
      return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat catatan: " + message }, { status: 500 });
  }
}

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

    const body = await req.json().catch(() => ({}));
    const { title, content, subject_id } = body;

    const updated = await updateNote(params.id, session.workspace_id, {
      title,
      content,
      subject_id,
    });

    if (!updated) {
      return NextResponse.json({ error: "Catatan tidak ditemukan untuk diperbarui." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Catatan berhasil diperbarui.",
      note: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui catatan: " + message }, { status: 500 });
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

    const deleted = await deleteNote(params.id, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Catatan tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Catatan berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus catatan: " + message }, { status: 500 });
  }
}
