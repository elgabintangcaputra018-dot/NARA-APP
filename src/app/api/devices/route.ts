import { NextRequest, NextResponse } from "next/server";
import { getSession, getDeviceSessions, getWorkspaceLicense } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("nara_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Sesi tidak ditemukan. Silakan login." }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa." }, { status: 401 });
    }

    const [devices, license] = await Promise.all([
      getDeviceSessions(session.workspace_id),
      getWorkspaceLicense(session.workspace_id),
    ]);

    const now = Date.now();
    const expiresAtMs = license?.expires_at ? new Date(license.expires_at).getTime() : 0;
    const daysRemaining = expiresAtMs > now ? Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)) : 0;
    const isApproachingExpiration = daysRemaining > 0 && daysRemaining <= 30;

    return NextResponse.json({
      success: true,
      currentDeviceId: session.device_id,
      devices,
      quota: {
        used: devices.length,
        max: 3,
        available: Math.max(0, 3 - devices.length),
      },
      license: {
        plan: license?.plan || "yearly_launching",
        planLabel:
          license?.plan === "yearly_launching"
            ? "Paket Peluncuran 1 Tahun"
            : "Paket Normal 1 Tahun",
        activatedAt: license?.activated_at,
        expiresAt: license?.expires_at,
        daysRemaining,
        isApproachingExpiration,
        status: license?.status || "active",
      },
    });
  } catch (error: unknown) {
    console.error("Get devices error:", error);
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json(
      { error: "Gagal memuat data perangkat: " + message },
      { status: 500 }
    );
  }
}
