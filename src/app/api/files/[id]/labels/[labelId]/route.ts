import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudyFileById, deleteDiagramLabel } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; labelId: string } }
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

    const file = await getStudyFileById(params.id, session.workspace_id);
    if (!file) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    const deleted = await deleteDiagramLabel(params.labelId, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Label tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Label titik penting berhasil dihapus.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus label: " + message }, { status: 500 });
  }
}
