import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get("nara_session")?.value;
  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  const response = NextResponse.json({
    success: true,
    message: "Berhasil keluar.",
  });

  response.cookies.delete("nara_session");
  response.cookies.delete("nara_workspace_id");
  response.cookies.delete("nara_current_device_id");

  return response;
}
