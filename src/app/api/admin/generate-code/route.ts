import { NextRequest, NextResponse } from "next/server";
import { generateLicenseCode } from "@/lib/license-generator";
import { createLicenseCode } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get("x-admin-key");
    const configuredKey = process.env.ADMIN_SECRET_KEY || "nara-admin-secret-2026";

    if (!adminKey || adminKey !== configuredKey) {
      return NextResponse.json(
        { error: "Akses ditolak: Kunci rahasia admin tidak valid." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const plan = body.plan === "yearly_normal" ? "yearly_normal" : "yearly_launching";
    const defaultPrice = plan === "yearly_launching" ? 150000 : 250000;
    const pricePaid = typeof body.price_paid === "number" ? body.price_paid : defaultPrice;

    const code = generateLicenseCode();
    const newLicense = await createLicenseCode({
      code,
      plan,
      price_paid: pricePaid,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Kode lisensi berhasil dibuat.",
        license: newLicense,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Admin generate code error:", error);
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json(
      { error: "Gagal membuat kode lisensi: " + message },
      { status: 500 }
    );
  }
}
