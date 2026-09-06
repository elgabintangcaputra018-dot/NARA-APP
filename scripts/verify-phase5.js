const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runPhase5Verification() {
  console.log("=================================================");
  console.log("🚀 TESTING FASE 5: MODUL CATATAN & RICH-TEXT EDITOR");
  console.log("=================================================\n");

  // Step 1: Generate Code & Activate
  console.log("1. Generating License & Activating Session...");
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
    throw new Error("Gagal generate license code: " + JSON.stringify(genRes.data));
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
      deviceId: "dev_phase5_tester",
      deviceName: "Desktop Tester Phase 5",
      deviceType: "desktop",
    }
  );

  if (actRes.status !== 200 || !actRes.data.success) {
    throw new Error("Gagal aktivasi sesi: " + JSON.stringify(actRes.data));
  }
  const sessionCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log("   ✅ Sesi aktif berhasil dibuat!");

  // Step 2: Create Subject
  console.log("\n2. Menyiapkan Mata Pelajaran Uji (Fisika OSN)...");
  const subRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/subjects",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      name: "Fisika Mekanika OSN",
      priority: "very_high",
      mode: "intensive",
      color: "#6B95F1",
    }
  );
  if (subRes.status !== 201 || !subRes.data.subject) {
    throw new Error("Gagal membuat mapel: " + JSON.stringify(subRes.data));
  }
  const subject1 = subRes.data.subject;
  console.log(`   ✅ Mapel "${subject1.name}" dibuat (ID: ${subject1.id})`);

  // Step 3: Create Study File for Attachment
  console.log("\n3. Mengunggah File Materi Uji untuk Lampiran...");
  const boundary = "----WebKitFormBoundaryPhase5Test";
  const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#6B95F1"/></svg>`;
  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="rumus-mekanika.svg"\r\n` +
      `Content-Type: image/svg+xml\r\n\r\n` +
      dummySvg + `\r\n` +
      `--${boundary}--\r\n`
    ),
  ]);

  const fileUploadRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/files",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": multipartBody.length,
          Cookie: sessionCookie,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(multipartBody);
    req.end();
  });

  if (fileUploadRes.status !== 201 || !fileUploadRes.data.file) {
    throw new Error("Gagal upload materi: " + JSON.stringify(fileUploadRes.data));
  }
  const attachedFile = fileUploadRes.data.file;
  console.log(`   ✅ File materi "${attachedFile.file_name}" berhasil diunggah.`);

  // Step 4: Create Note 1
  console.log("\n4. Membuat Catatan 1: 'Hukum Newton & Dinamika Rotasi'...");
  const note1Content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Hukum Newton & Torsi Rotasi" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Pada sistem benda tegar, torsi total bernilai tau = I * alpha. Momentum sudut kekal jika tidak ada torsi eksternal.",
          },
        ],
      },
    ],
  };

  const note1Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/notes",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      title: "Hukum Newton & Dinamika Rotasi",
      subject_id: subject1.id,
      content: note1Content,
    }
  );

  if (note1Res.status !== 201 || !note1Res.data.note) {
    throw new Error("Gagal membuat catatan 1: " + JSON.stringify(note1Res.data));
  }
  const note1 = note1Res.data.note;
  console.log(`   ✅ Catatan 1 dibuat (ID: ${note1.id})`);

  // Step 5: Add Tags to Note 1
  console.log("\n5. Menambahkan Tag ke Catatan 1 ('fisika', 'rotasi', 'olimpiade')...");
  for (const tag of ["fisika", "rotasi", "olimpiade"]) {
    const tagRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: `/api/notes/${note1.id}/tags`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
      },
      { tag }
    );
    if (tagRes.status !== 201) {
      throw new Error(`Gagal tambah tag ${tag}: ` + JSON.stringify(tagRes.data));
    }
  }
  console.log("   ✅ Semua tag berhasil ditambahkan.");

  // Step 6: Create Note 2
  console.log("\n6. Membuat Catatan 2: 'Termodinamika & Hukum Gas Ideal'...");
  const note2Content = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Persamaan keadaan gas ideal: PV = nRT. Proses adiabatik memenuhi P * V^gamma = konstan.",
          },
        ],
      },
    ],
  };

  const note2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/notes",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      title: "Termodinamika & Hukum Gas Ideal",
      subject_id: subject1.id,
      content: note2Content,
    }
  );

  if (note2Res.status !== 201 || !note2Res.data.note) {
    throw new Error("Gagal membuat catatan 2: " + JSON.stringify(note2Res.data));
  }
  const note2 = note2Res.data.note;
  console.log(`   ✅ Catatan 2 dibuat (ID: ${note2.id})`);

  // Step 7: Full-Text Search
  console.log("\n7. Menguji Full-Text Search (kata kunci: 'momentum')...");
  const searchRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/notes?q=momentum",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (searchRes.status !== 200 || !searchRes.data.notes) {
    throw new Error("Gagal mencari catatan: " + JSON.stringify(searchRes.data));
  }
  const searchFound = searchRes.data.notes.some((n) => n.id === note1.id);
  if (!searchFound) {
    throw new Error("Full-text search gagal menemukan Catatan 1 yang mengandung kata 'momentum'!");
  }
  console.log("   ✅ Full-text search berhasil menemukan Catatan 1!");

  // Step 8: Filter by Tag
  console.log("\n8. Menguji Filter by Tag ('rotasi')...");
  const tagFilterRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/notes?tag=rotasi",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (tagFilterRes.status !== 200 || !tagFilterRes.data.notes) {
    throw new Error("Gagal filter by tag: " + JSON.stringify(tagFilterRes.data));
  }
  const hasNote1InTag = tagFilterRes.data.notes.some((n) => n.id === note1.id);
  const hasNote2InTag = tagFilterRes.data.notes.some((n) => n.id === note2.id);
  if (!hasNote1InTag || hasNote2InTag) {
    throw new Error("Filter tag 'rotasi' tidak akurat!");
  }
  console.log("   ✅ Filter by tag akurat (hanya catatan dengan tag 'rotasi' yang muncul).");

  // Step 9: Autocomplete candidates for linking
  console.log("\n9. Menguji Autocomplete Tautan Catatan ('Termo')...");
  const candRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/notes/${note1.id}/links?q=Termo`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (candRes.status !== 200 || !candRes.data.notes) {
    throw new Error("Gagal autocomplete tautan: " + JSON.stringify(candRes.data));
  }
  const foundCand = candRes.data.notes.find((n) => n.id === note2.id);
  if (!foundCand) {
    throw new Error("Catatan 2 tidak muncul di kandidat autocomplete tautan!");
  }
  console.log(`   ✅ Autocomplete berhasil menemukan kandidat: "${foundCand.title}"`);

  // Step 10: Link Note 1 to Note 2
  console.log("\n10. Menautkan Catatan 1 -> Catatan 2 ('Catatan Terkait')...");
  const linkRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/links`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { targetNoteId: note2.id }
  );
  if (linkRes.status !== 201 || !linkRes.data.link) {
    throw new Error("Gagal membuat tautan catatan: " + JSON.stringify(linkRes.data));
  }
  const createdLink = linkRes.data.link;
  console.log(`   ✅ Catatan berhasil ditautkan (Link ID: ${createdLink.id})`);

  // Step 11: Attach Study File to Note 1
  console.log("\n11. Melampirkan File Materi ke Catatan 1...");
  const attachRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/attachments`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { file_id: attachedFile.id }
  );
  if (attachRes.status !== 201 || !attachRes.data.attachment) {
    throw new Error("Gagal melampirkan file materi: " + JSON.stringify(attachRes.data));
  }
  const createdAttachment = attachRes.data.attachment;
  console.log(`   ✅ Dokumen berhasil dilampirkan (Attachment ID: ${createdAttachment.id})`);

  // Step 12: Verify Note 1 Details with Links & Attachments
  console.log("\n12. Memeriksa Detail Lengkap Catatan 1 (GET /api/notes/[id])...");
  const detailRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/notes/${note1.id}`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (detailRes.status !== 200 || !detailRes.data.note) {
    throw new Error("Gagal mengambil detail catatan: " + JSON.stringify(detailRes.data));
  }
  const detailNote = detailRes.data.note;
  console.log(`   - Judul: ${detailNote.title}`);
  console.log(`   - Tags: ${JSON.stringify(detailNote.tags)}`);
  console.log(`   - Tautan Catatan: ${detailNote.links.length} buah`);
  console.log(`   - Lampiran Dokumen: ${detailNote.attachments.length} buah`);

  if (detailNote.tags.length !== 3) throw new Error("Jumlah tag tidak cocok");
  if (detailNote.links.length !== 1) throw new Error("Jumlah tautan tidak cocok");
  if (detailNote.attachments.length !== 1) throw new Error("Jumlah lampiran tidak cocok");
  console.log("   ✅ Semua relasi data Catatan 1 terverifikasi dengan sempurna!");

  // Step 13: Autosave Simulation (PUT /api/notes/[id])
  console.log("\n13. Menguji Autosave Perubahan Judul & Konten...");
  const updatedTitle = "Hukum Newton & Dinamika Rotasi (Revisi Lengkap OSN)";
  const putRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { title: updatedTitle }
  );
  if (putRes.status !== 200 || putRes.data.note?.title !== updatedTitle) {
    throw new Error("Gagal update autosave catatan: " + JSON.stringify(putRes.data));
  }
  console.log("   ✅ Autosave berhasil memperbarui judul catatan!");

  // Step 14: Delete Note 2 and verify cleanup
  console.log("\n14. Menguji Hapus Catatan...");
  const delRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/notes/${note2.id}`,
    method: "DELETE",
    headers: { Cookie: sessionCookie },
  });
  if (delRes.status !== 200) {
    throw new Error("Gagal menghapus catatan 2: " + JSON.stringify(delRes.data));
  }
  console.log("   ✅ Catatan 2 berhasil dihapus.");

  console.log("\n=================================================");
  console.log("🎉 SEMUA TEST FASE 5 (MODUL CATATAN) LOLOS 100%!");
  console.log("=================================================\n");
}

runPhase5Verification().catch((err) => {
  console.error("\n❌ TEST FASE 5 GAGAL:", err);
  process.exit(1);
});
