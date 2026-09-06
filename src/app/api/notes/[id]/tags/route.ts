import { NextRequest, NextResponse } from "next/server";
import { getSession, getNoteById, addNoteTag, deleteNoteTag } from "@/lib/db";

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
    const { tag } = body;
    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "Tag diperlukan." }, { status: 400 });
    }

    const created = await addNoteTag(params.id, tag, session.workspace_id);

    return NextResponse.json(
      {
        success: true,
        message: "Tag berhasil ditambahkan.",
        tag: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menambah tag: " + message }, { status: 500 });
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

    const note = await getNoteById(params.id, session.workspace_id);
    if (!note) {
      return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const tagText = searchParams.get("tag");
    if (!tagText) {
      return NextResponse.json({ error: "Query param 'tag' diperlukan." }, { status: 400 });
    }

    const deleted = await deleteNoteTag(params.id, tagText, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Tag tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Tag berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus tag: " + message }, { status: 500 });
  }
}
