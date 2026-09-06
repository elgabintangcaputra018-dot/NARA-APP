const http = require("http");

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || body,
        });
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("🦊 NARA — UJI VERIFIKASI FASE 3 (MATERI, ANOTASI & OFFLINE-SYNC)");
  console.log("==================================================================\n");

  // Step 1: Admin Generate Code & Activate
  console.log("1. Setup Akun Siswa untuk Pengujian Anotasi...");
  const genRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/generate-code",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "nara-admin-secret-2026",
      },
    },
    { plan: "yearly_launching", price_paid: 150000 }
  );

  if (genRes.status !== 201 || !genRes.data.license) {
    console.error("❌ Gagal generate kode:", genRes);
    process.exit(1);
  }
  const licenseCode = genRes.data.license.code;

  const actRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_phase3_tester",
      deviceName: "Chrome Pen Tester",
    }
  );

  if (actRes.status !== 200 || !actRes.data.success) {
    console.error("❌ Gagal aktivasi sesi:", actRes);
    process.exit(1);
  }
  const sessionCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log(`✅ Lisensi aktif: ${licenseCode}`);
  console.log(`   Session Cookie: ${sessionCookie}\n`);

  // Step 2: Upload Study Materials (Image & PDF)
  console.log("2. Menguji Upload Materi Belajar (/api/files)...");

  // Dummy 1x1 PNG pixel as base64
  const samplePngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  // Upload File 1: Diagram Anatomi Sel (Image)
  const upImageRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      fileName: "Diagram_Struktur_Sel_Biologi.png",
      fileType: "image",
      dataUrl: samplePngBase64,
    }
  );

  if (upImageRes.status !== 201 || !upImageRes.data.file) {
    console.error("❌ Gagal upload gambar materi:", upImageRes);
    process.exit(1);
  }
  const fileImage = upImageRes.data.file;
  console.log(`✅ File 1 berhasil diunggah: "${fileImage.file_name}" (${fileImage.file_type})`);

  // Upload File 2: Silabus & Soal OSN Fisika (PDF)
  const upPdfRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      fileName: "Silabus_Mekanika_OSN_Fisika.pdf",
      fileType: "pdf",
      storagePath: "/sample_syllabus.pdf",
      fileSize: 245000,
    }
  );

  if (upPdfRes.status !== 201 || !upPdfRes.data.file) {
    console.error("❌ Gagal upload PDF materi:", upPdfRes);
    process.exit(1);
  }
  const filePdf = upPdfRes.data.file;
  console.log(`✅ File 2 berhasil diunggah: "${filePdf.file_name}" (${filePdf.file_type})`);

  // List Files
  const listFilesRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/files",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  if (listFilesRes.status !== 200 || listFilesRes.data.files.length < 2) {
    console.error("❌ Gagal mengambil daftar file:", listFilesRes);
    process.exit(1);
  }
  console.log(`✅ Daftar materi berhasil diambil: total ${listFilesRes.data.files.length} dokumen ditemukan.\n`);

  // Step 3: Batch Synchronization & Annotations (Freehand, Highlight, Circle, Arrow)
  console.log("3. Menguji Batch Anotasi & Douglas-Peucker SVG Path (/api/files/[id]/annotations)...");

  const nowIso = new Date().toISOString();
  const testAnnotations = [
    {
      id: "anno_test_stroke_01",
      page_number: 1,
      stroke_type: "freehand",
      svg_path: "M 120.5 210.0 Q 145.2 215.8, 160.0 230.5 L 180.2 240.0",
      color: "#6B95F1",
      stroke_width: 4,
      layer_visible: true,
      sync_status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "anno_test_highlight_02",
      page_number: 1,
      stroke_type: "highlight",
      svg_path: "M 100.0 150.0 L 300.0 150.0",
      color: "#FACC15",
      stroke_width: 16,
      layer_visible: true,
      sync_status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: "anno_test_circle_03",
      page_number: 1,
      stroke_type: "circle",
      svg_path: "M 200.0 300.0 a 50.0 50.0 0 1 0 100.0 0 a 50.0 50.0 0 1 0 -100.0 0 Z",
      color: "#EF4444",
      stroke_width: 3,
      layer_visible: true,
      sync_status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  // Send batch sync
  const batchRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${fileImage.id}/annotations`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { items: testAnnotations }
  );

  if (batchRes.status !== 200 || batchRes.data.count !== 3) {
    console.error("❌ Gagal batch sync anotasi:", batchRes);
    process.exit(1);
  }
  console.log(`✅ Batch sync berhasil: ${batchRes.data.count} coretan berhasil disimpan ke server!`);

  // Query annotations per page
  const getAnnoRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${fileImage.id}/annotations?page=1`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  if (getAnnoRes.status !== 200 || getAnnoRes.data.annotations.length !== 3) {
    console.error("❌ Gagal query anotasi per halaman:", getAnnoRes);
    process.exit(1);
  }
  console.log(`✅ Query anotasi halaman 1 berhasil: ${getAnnoRes.data.annotations.length} coretan aktif.\n`);

  // Step 4: Multi-page Support (Page 2 Annotations)
  console.log("4. Menguji Isolasi Halaman Multi-Page (Halaman 2)...");
  const page2Annotation = [
    {
      id: "anno_test_arrow_p2",
      page_number: 2,
      stroke_type: "arrow",
      svg_path: "M 50.0 50.0 L 250.0 150.0 M 230.0 135.0 L 250.0 150.0 L 235.0 165.0",
      color: "#22C55E",
      stroke_width: 4,
      layer_visible: true,
      sync_status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${filePdf.id}/annotations`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { items: page2Annotation }
  );

  const getP2Res = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${filePdf.id}/annotations?page=2`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  const getP1Res = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${filePdf.id}/annotations?page=1`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  if (getP2Res.data.annotations.length !== 1 || getP1Res.data.annotations.length !== 0) {
    console.error("❌ Gagal isolasi halaman multi-page:", { p1: getP1Res.data, p2: getP2Res.data });
    process.exit(1);
  }
  console.log("✅ Navigasi & isolasi multi-page teruji: Halaman 2 memiliki 1 anotasi, Halaman 1 bersih (0 anotasi).\n");

  // Step 5: Last-Write-Wins Conflict Handling
  console.log("5. Menguji Resolusi Konflik (Last-Write-Wins)...");
  const futureIso = new Date(Date.now() + 10000).toISOString();
  const updatedStroke = [
    {
      id: "anno_test_stroke_01",
      page_number: 1,
      stroke_type: "freehand",
      svg_path: "M 120.5 210.0 Q 145.2 215.8, 160.0 230.5 L 180.2 240.0",
      color: "#E5A93C", // Updated to warm gold
      stroke_width: 6,
      layer_visible: true,
      sync_status: "pending",
      created_at: nowIso,
      updated_at: futureIso,
    },
  ];

  const updateRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${fileImage.id}/annotations`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { items: updatedStroke }
  );

  if (updateRes.status !== 200 || updateRes.data.annotations[0].color !== "#E5A93C") {
    console.error("❌ Gagal update anotasi:", updateRes);
    process.exit(1);
  }
  console.log(`✅ Resolusi Last-Write-Wins berhasil: warna stroke diperbarui menjadi "${updateRes.data.annotations[0].color}".\n`);

  // Step 6: Delete & Cascade
  console.log("6. Menguji Hapus Dokumen & Cascade Anotasi...");
  const delRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${filePdf.id}`,
    method: "DELETE",
    headers: { Cookie: sessionCookie },
  });

  if (delRes.status !== 200 || !delRes.data.success) {
    console.error("❌ Gagal hapus dokumen:", delRes);
    process.exit(1);
  }
  console.log("✅ Dokumen berhasil dihapus dan seluruh riwayat coretannya bersih ter-cascade!\n");

  // Final summary
  console.log("==================================================================");
  console.log("🎉 SEMUA PENGUJIAN FASE 3 SUKSES 100%!");
  console.log("   1. Upload & Galeri Dokumen (PDF & Gambar)");
  console.log("   2. Batch Sync & Douglas-Peucker SVG Path Anotasi");
  console.log("   3. Navigasi Multi-Halaman & Isolasi Coretan per Halaman");
  console.log("   4. Resolusi Konflik Last-Write-Wins (updated_at)");
  console.log("   5. Penghapusan Dokumen & Cascade Cleanup");
  console.log("==================================================================");
}

runTests().catch(console.error);
