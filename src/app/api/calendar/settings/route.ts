import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getCalendarConnection,
  updateCalendarSettings,
  disconnectCalendar,
} from "@/lib/db";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";

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

    const connection = await getCalendarConnection(session.workspace_id);

    return NextResponse.json({
      success: true,
      isConnected: Boolean(connection && connection.is_connected),
      syncMode: connection?.sync_mode || "two_way",
      lastUpdated: connection?.updated_at,
      isRealApiConfigured: isGoogleCalendarConfigured(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat pengaturan kalender: " + message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { sync_mode } = body;

    if (sync_mode && !["two_way", "read_only"].includes(sync_mode)) {
      return NextResponse.json({ error: "Mode sinkronisasi tidak valid." }, { status: 400 });
    }

    const updated = await updateCalendarSettings(session.workspace_id, {
      sync_mode: sync_mode as "two_way" | "read_only",
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan sinkronisasi berhasil diperbarui.",
      settings: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memperbarui pengaturan: " + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    await disconnectCalendar(session.workspace_id);

    return NextResponse.json({
      success: true,
      message: "Koneksi Google Calendar berhasil diputuskan.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memutuskan koneksi kalender: " + message }, { status: 500 });
  }
}
