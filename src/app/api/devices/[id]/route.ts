import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteDeviceSession, getDeviceSessions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan. Silakan login." }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa." }, { status: 401 });
    }

    const deviceSessionId = params.id;
    if (!deviceSessionId) {
      return NextResponse.json({ error: "ID perangkat wajib diberikan." }, { status: 400 });
    }

    // Check device list
    const devices = await getDeviceSessions(session.workspace_id);
    const targetDevice = devices.find((d) => d.id === deviceSessionId);

    if (!targetDevice) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan di ruang belajar ini." },
        { status: 404 }
      );
    }

    // Prevent deleting the currently active device
    if (targetDevice.device_id === session.device_id) {
      return NextResponse.json(
        {
          error:
            "Anda tidak dapat menghapus perangkat yang sedang aktif digunakan saat ini. Gunakan perangkat lain untuk menghapusnya, atau logout.",
        },
        { status: 400 }
      );
    }

    const deleted = await deleteDeviceSession(deviceSessionId, session.workspace_id);
    if (!deleted) {
      return NextResponse.json({ error: "Gagal menghapus perangkat." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Perangkat "${targetDevice.device_name}" berhasil dihapus. Slot perangkat kini tersedia kembali.`,
    });
  } catch (error: unknown) {
    console.error("Delete device error:", error);
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus perangkat: " + message },
      { status: 500 }
    );
  }
}
