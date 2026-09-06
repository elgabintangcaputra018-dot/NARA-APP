import { NextRequest, NextResponse } from "next/server";
import { getSession, getSyllabi, createSyllabus } from "@/lib/db";

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

    const syllabi = await getSyllabi(session.workspace_id);
    return NextResponse.json({ success: true, syllabi });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat silabus: " + message }, { status: 500 });
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
    const { title, subject_id, file_id, deadline, topics } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Judul silabus wajib diisi." }, { status: 400 });
    }
    if (!subject_id || typeof subject_id !== "string") {
      return NextResponse.json({ error: "Mata pelajaran wajib dipilih." }, { status: 400 });
    }
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: "Silabus harus memiliki minimal satu topik." }, { status: 400 });
    }

    const newSyllabus = await createSyllabus({
      workspace_id: session.workspace_id,
      subject_id,
      file_id: file_id || null,
      title: title.trim(),
      deadline: deadline || null,
      topics,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Silabus berhasil disimpan.",
        syllabus: newSyllabus,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal membuat silabus: " + message }, { status: 500 });
  }
}
