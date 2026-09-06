import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudyFileById, getDiagramLabelsByFile, createDiagramLabel } from "@/lib/db";

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

    const labels = await getDiagramLabelsByFile(params.id, session.workspace_id, pageNumber);

    return NextResponse.json({
      success: true,
      labels,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat label: " + message }, { status: 500 });
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
    const { area_x, area_y, area_width, area_height, label_text, page_number } = body;

    if (
      typeof area_x !== "number" ||
      typeof area_y !== "number" ||
      typeof area_width !== "number" ||
      typeof area_height !== "number" ||
      !label_text ||
      typeof label_text !== "string"
    ) {
      return NextResponse.json(
        { error: "Parameter area (x, y, w, h) dan label_text harus valid." },
        { status: 400 }
      );
    }

    const created = await createDiagramLabel({
      workspace_id: session.workspace_id,
      file_id: params.id,
      page_number: typeof page_number === "number" ? page_number : 1,
      area_x: Math.max(0, Math.min(1, area_x)),
      area_y: Math.max(0, Math.min(1, area_y)),
      area_width: Math.max(0.01, Math.min(1, area_width)),
      area_height: Math.max(0.01, Math.min(1, area_height)),
      label_text: label_text.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Label titik penting berhasil ditandai.",
        label: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menyimpan label: " + message }, { status: 500 });
  }
}
