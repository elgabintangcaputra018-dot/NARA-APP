import { NextRequest, NextResponse } from "next/server";
import { getSession, getSyllabusById, updateSyllabus, deleteSyllabus } from "@/lib/db";

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

    const syllabus = await getSyllabusById(params.id, session.workspace_id);
    if (!syllabus) {
      return NextResponse.json({ error: "Silabus tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, syllabus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat silabus: " + message }, { status: 500 });
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
    const { title, deadline, subject_id } = body;

    const updated = await updateSyllabus(params.id, session.workspace_id, {
      title,
      deadline,
      subject_id,
    });

    if (!updated) {
      return NextResponse.json({ error: "Silabus tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Silabus berhasil diperbarui.",
      syllabus: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui silabus: " + message }, { status: 500 });
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

    const deleted = await deleteSyllabus(params.id, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Silabus tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Silabus berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus silabus: " + message }, { status: 500 });
  }
}
