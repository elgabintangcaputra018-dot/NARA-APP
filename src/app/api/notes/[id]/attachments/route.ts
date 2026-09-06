import { NextRequest, NextResponse } from "next/server";
import { getSession, getNoteById, getStudyFileById, addNoteAttachment, deleteNoteAttachment } from "@/lib/db";

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

    const note = await getNoteById(params.id, session.workspace_id);
    if (!note) {
      return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { file_id, annotation_id } = body;

    if (!file_id && !annotation_id) {
      return NextResponse.json({ error: "file_id atau annotation_id diperlukan." }, { status: 400 });
    }

    let fileRecord = null;
    if (file_id) {
      fileRecord = await getStudyFileById(file_id, session.workspace_id);
      if (!fileRecord) {
        return NextResponse.json({ error: "File materi tidak ditemukan." }, { status: 404 });
      }
    }

    const attachment = await addNoteAttachment(
      params.id,
      { file_id, annotation_id },
      session.workspace_id
    );

    return NextResponse.json(
      {
        success: true,
        message: "Lampiran berhasil ditambahkan.",
        attachment: {
          ...attachment,
          file: fileRecord,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menambah lampiran: " + message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest
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

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) {
      return NextResponse.json({ error: "Query param 'attachmentId' diperlukan." }, { status: 400 });
    }

    const deleted = await deleteNoteAttachment(attachmentId, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Lampiran berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus lampiran: " + message }, { status: 500 });
  }
}
