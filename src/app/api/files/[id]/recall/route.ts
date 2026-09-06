import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getStudyFileById,
  getDiagramLabelsByFile,
  recordRecallAttempt,
  getRecallStatsByFile,
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

    const stats = await getRecallStatsByFile(params.id, session.workspace_id, pageNumber);

    return NextResponse.json({
      success: true,
      file,
      ...stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat statistik recall: " + message }, { status: 500 });
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
    const { labelId, userAnswer, isCorrect } = body;

    if (!labelId) {
      return NextResponse.json({ error: "labelId diperlukan." }, { status: 400 });
    }

    const labels = await getDiagramLabelsByFile(params.id, session.workspace_id);
    const targetLabel = labels.find((l) => l.id === labelId);

    if (!targetLabel) {
      return NextResponse.json({ error: "Label diagram tidak ditemukan." }, { status: 404 });
    }

    // Determine correctness
    let correct = false;
    if (typeof isCorrect === "boolean") {
      correct = isCorrect;
    } else if (typeof userAnswer === "string") {
      const cleanUser = userAnswer.trim().toLowerCase();
      const cleanTarget = targetLabel.label_text.trim().toLowerCase();
      correct = cleanUser === cleanTarget;
    }

    await recordRecallAttempt({
      workspace_id: session.workspace_id,
      diagram_label_id: labelId,
      correct,
      user_answer: typeof userAnswer === "string" ? userAnswer.trim() : undefined,
    });

    const updatedStats = await getRecallStatsByFile(
      params.id,
      session.workspace_id,
      targetLabel.page_number
    );

    return NextResponse.json({
      success: true,
      correct,
      label_text: targetLabel.label_text,
      ...updatedStats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menyimpan attempt recall: " + message }, { status: 500 });
  }
}
