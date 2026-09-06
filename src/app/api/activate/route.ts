import { NextRequest, NextResponse } from "next/server";
import {
  getLicenseByCode,
  activateLicense,
  createWorkspace,
  getDeviceSessions,
  createDeviceSession,
  updateDeviceSessionActivity,
  createSession,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, deviceId, deviceName } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Kode aktivasi wajib diisi." },
        { status: 400 }
      );
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "Identitas perangkat (device_id) tidak terdeteksi." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const license = await getLicenseByCode(cleanCode);

    if (!license) {
      return NextResponse.json(
        {
          error:
            "Kode aktivasi tidak ditemukan. Pastikan kode ditulis dengan benar (format: NARA-XXXX-XXXX-XXXX).",
        },
        { status: 400 }
      );
    }

    // Check if expired
    if (license.status === "expired") {
      return NextResponse.json(
        { error: "Kode ini sudah kedaluwarsa, silakan perpanjang langganan." },
        { status: 400 }
      );
    }

    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Kode ini sudah kedaluwarsa, silakan perpanjang langganan." },
        { status: 400 }
      );
    }

    let targetWorkspaceId = license.workspace_id;
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // 1. If status 'unused': create new workspace & activate
    if (license.status === "unused" || !targetWorkspaceId) {
      const workspaceName = `Ruang Belajar Siswa (${cleanCode.substring(5, 9)})`;
      const workspace = await createWorkspace(workspaceName);
      targetWorkspaceId = workspace.id;

      await activateLicense(
        license.id,
        targetWorkspaceId,
        now.toISOString(),
        oneYearLater.toISOString()
      );

      // Create first device session
      await createDeviceSession({
        workspace_id: targetWorkspaceId,
        device_id: deviceId,
        device_name: deviceName || "Perangkat Utama",
      });
    } else {
      // 2. If status 'active': check device registration
      const existingSessions = await getDeviceSessions(targetWorkspaceId);
      const isDeviceAlreadyRegistered = existingSessions.some(
        (d) => d.device_id === deviceId
      );

      if (isDeviceAlreadyRegistered) {
        // Device is re-logging in: update activity timestamp
        await updateDeviceSessionActivity(targetWorkspaceId, deviceId);
      } else {
        // Device not registered yet: check 3-device limit
        if (existingSessions.length >= 3) {
          return NextResponse.json(
            {
              error:
                "Kode ini sudah dipakai di 3 perangkat. Hapus salah satu di halaman Kelola Perangkat sebelum menambah perangkat baru.",
              maxDevicesReached: true,
              activeDevicesCount: existingSessions.length,
            },
            { status: 400 }
          );
        }

        // Add device session
        await createDeviceSession({
          workspace_id: targetWorkspaceId,
          device_id: deviceId,
          device_name: deviceName || "Perangkat Tambahan",
        });
      }
    }

    // Generate custom session token
    const sessionToken = `nara_${crypto.randomUUID().replace(/-/g, "")}_${Date.now()}`;
    await createSession({
      token: sessionToken,
      workspace_id: targetWorkspaceId,
      device_id: deviceId,
      expires_at: oneYearLater.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      message: "Aktivasi berhasil! Selamat datang di Nara.",
      workspaceId: targetWorkspaceId,
    });

    // Set secure httpOnly cookie
    response.cookies.set("nara_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });

    // Also store workspace_id and current device_id in readable cookies for client convenience
    response.cookies.set("nara_workspace_id", targetWorkspaceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("nara_current_device_id", deviceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Activation route error:", error);
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json(
      { error: "Terjadi kesalahan saat aktivasi: " + message },
      { status: 500 }
    );
  }
}
