import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudyFiles, createStudyFile } from "@/lib/db";
import fs from "fs";
import path from "path";

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

    const files = await getStudyFiles(session.workspace_id);
    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal memuat dokumen: " + message }, { status: 500 });
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

    const contentType = req.headers.get("content-type") || "";

    let fileName = "";
    let fileType: "pdf" | "image" = "image";
    let storagePath = "";
    let fileSize = 0;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "File tidak ditemukan dalam form data" }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;
      const mime = file.type.toLowerCase();
      fileType = mime.includes("pdf") ? "pdf" : "image";

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save locally to public/uploads directory for easy access
      const uploadsDir = path.join(process.cwd(), "public", "uploads", session.workspace_id);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeFileName);
      fs.writeFileSync(filePath, buffer);

      storagePath = `/uploads/${session.workspace_id}/${safeFileName}`;
    } else {
      // JSON body (supports base64 dataUrl)
      const body = await req.json().catch(() => ({}));
      fileName = body.fileName || body.file_name || "Dokumen Materi";
      fileType = body.fileType || body.file_type || (fileName.endsWith(".pdf") ? "pdf" : "image");
      fileSize = body.fileSize || body.file_size || 0;

      if (body.dataUrl) {
        const matches = body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], "base64");
          fileSize = buffer.length;

          const uploadsDir = path.join(process.cwd(), "public", "uploads", session.workspace_id);
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const filePath = path.join(uploadsDir, safeFileName);
          fs.writeFileSync(filePath, buffer);
          storagePath = `/uploads/${session.workspace_id}/${safeFileName}`;
        } else {
          storagePath = body.dataUrl;
        }
      } else {
        storagePath = body.storagePath || body.storage_path || "/placeholders/sample_material.png";
      }
    }

    const created = await createStudyFile({
      workspace_id: session.workspace_id,
      file_name: fileName,
      file_type: fileType,
      storage_path: storagePath,
      file_size: fileSize,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dokumen materi berhasil diunggah.",
        file: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kesalahan server";
    return NextResponse.json({ error: "Gagal mengunggah dokumen: " + message }, { status: 500 });
  }
}
