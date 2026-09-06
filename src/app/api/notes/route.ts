import { NextRequest, NextResponse } from "next/server";
import { getSession, getNotes, createNote } from "@/lib/db";

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
    const q = searchParams.get("q") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const tag = searchParams.get("tag") || undefined;

    const notes = await getNotes(session.workspace_id, {
      search: q,
      subject_id: subjectId,
      tag: tag,
    });

    return NextResponse.json({
      success: true,
      notes,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat catatan: " + message }, { status: 500 });
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
    const { title, content, subject_id } = body;

    const newNote = await createNote({
      workspace_id: session.workspace_id,
      subject_id: subject_id || null,
      title: title || "Catatan Tanpa Judul",
      content: content || {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Catatan berhasil dibuat.",
        note: newNote,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal membuat catatan: " + message }, { status: 500 });
  }
}
