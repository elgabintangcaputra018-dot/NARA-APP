import { NextRequest, NextResponse } from "next/server";
import { getSession, getSubjects, createSubject } from "@/lib/db";

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

    const subjects = await getSubjects(session.workspace_id);
    return NextResponse.json({ success: true, subjects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat mata pelajaran: " + message }, { status: 500 });
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
    const { name, priority, mode, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama mata pelajaran wajib diisi." }, { status: 400 });
    }

    const validPriorities = ["very_high", "high", "medium", "low", "very_low"];
    const validModes = ["intensive", "moderate", "deadline_crunch"];

    const selectedPriority = validPriorities.includes(priority) ? priority : "medium";
    const selectedMode = validModes.includes(mode) ? mode : "moderate";
    const selectedColor = color || "#6B95F1";

    const newSubject = await createSubject({
      workspace_id: session.workspace_id,
      name: name.trim(),
      priority: selectedPriority,
      mode: selectedMode,
      color: selectedColor,
    });

    return NextResponse.json({
      success: true,
      message: `Mata pelajaran "${newSubject.name}" berhasil ditambahkan.`,
      subject: newSubject,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal menambahkan mata pelajaran: " + message }, { status: 500 });
  }
}
