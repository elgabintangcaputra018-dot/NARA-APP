import { NextRequest, NextResponse } from "next/server";
import { getSession, getNoteById, getNotes, addNoteLink, deleteNoteLink } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: search notes in workspace for autocomplete linking
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

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const allNotes = await getNotes(session.workspace_id, { search: q });
    // Exclude current note
    const candidates = allNotes
      .filter((n) => n.id !== params.id)
      .slice(0, 10)
      .map((n) => ({
        id: n.id,
        title: n.title,
        subject: n.subject,
      }));

    return NextResponse.json({
      success: true,
      notes: candidates,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal mencari catatan: " + message }, { status: 500 });
  }
}

// POST: link to target note
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

    const sourceNote = await getNoteById(params.id, session.workspace_id);
    if (!sourceNote) {
      return NextResponse.json({ error: "Catatan asal tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { targetNoteId } = body;
    if (!targetNoteId) {
      return NextResponse.json({ error: "targetNoteId diperlukan." }, { status: 400 });
    }

    const targetNote = await getNoteById(targetNoteId, session.workspace_id);
    if (!targetNote) {
      return NextResponse.json({ error: "Catatan target tidak ditemukan." }, { status: 404 });
    }

    const link = await addNoteLink(params.id, targetNoteId, session.workspace_id);

    return NextResponse.json(
      {
        success: true,
        message: "Catatan berhasil ditautkan.",
        link: {
          ...link,
          title: targetNote.title,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menautkan catatan: " + message }, { status: 500 });
  }
}

// DELETE: remove note link
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
    const linkId = searchParams.get("linkId");
    if (!linkId) {
      return NextResponse.json({ error: "Query param 'linkId' diperlukan." }, { status: 400 });
    }

    const deleted = await deleteNoteLink(linkId, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Tautan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Tautan catatan berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus tautan: " + message }, { status: 500 });
  }
}
