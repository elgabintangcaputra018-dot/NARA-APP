import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getStudyFileById,
  getAnnotationsByFile,
  upsertAnnotationsBatch,
} from "@/lib/db";

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

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const pageNumber = pageParam ? parseInt(pageParam, 10) : undefined;

    const annotations = await getAnnotationsByFile(params.id, session.workspace_id, pageNumber);

    return NextResponse.json({
      success: true,
      annotations,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat anotasi: " + message }, { status: 500 });
  }
}

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

    const file = await getStudyFileById(params.id, session.workspace_id);
    if (!file) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada item untuk disinkronkan.",
        annotations: [],
      });
    }

    const upserted = await upsertAnnotationsBatch(session.workspace_id, params.id, items);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${upserted.length} anotasi.`,
      count: upserted.length,
      annotations: upserted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menyinkronkan anotasi: " + message }, { status: 500 });
  }
}
