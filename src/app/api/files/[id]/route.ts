import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudyFileById, deleteStudyFile } from "@/lib/db";
import fs from "fs";
import path from "path";

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

    const file = await getStudyFileById(params.id, session.workspace_id);
    if (!file) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      file,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal mengambil dokumen: " + message }, { status: 500 });
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

    const file = await getStudyFileById(params.id, session.workspace_id);
    if (!file) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    // Attempt to remove local file if stored in public/uploads
    if (file.storage_path && file.storage_path.startsWith("/uploads/")) {
      const localFilePath = path.join(process.cwd(), "public", file.storage_path);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch {}
      }
    }

    await deleteStudyFile(params.id, session.workspace_id);

    return NextResponse.json({
      success: true,
      message: "Dokumen berhasil dihapus beserta seluruh riwayat anotasi.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menghapus dokumen: " + message }, { status: 500 });
  }
}
