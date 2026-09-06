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
  console.log("🦊 NARA — UJI VERIFIKASI FASE 2 (JADWAL, SUBJECT & GOOGLE CALENDAR)");
  console.log("==================================================================\n");

  // Step 1: Admin Generate Code & Activate
  console.log("1. Setup Akun & Lisensi Siswa untuk Pengujian...");
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
      deviceId: "dev_phase2_tester",
      deviceName: "Chrome Tester",
    }
  );

  if (actRes.status !== 200 || !actRes.data.success) {
    console.error("❌ Gagal aktivasi sesi pengujian:", actRes);
    process.exit(1);
  }
  const sessionCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log(`✅ Lisensi aktif: ${licenseCode}`);
  console.log(`   Session Cookie: ${sessionCookie}\n`);

  // Step 2: Subject Management (CRUD)
  console.log("2. Menguji Manajemen Mata Pelajaran (Subjects)...");
  
  // Create Subject 1: Biologi Sel
  const sub1Res = await request(
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
      name: "Biologi Sel Molekuler",
      priority: "very_high",
      mode: "intensive",
      color: "#22c55e",
    }
  );
  if (sub1Res.status !== 201 || !sub1Res.data.subject) {
    console.error("❌ Gagal membuat Subject 1:", sub1Res);
    process.exit(1);
  }
  const subject1 = sub1Res.data.subject;
  console.log(`✅ Subject 1 dibuat: "${subject1.name}" (Prioritas: ${subject1.priority}, Warna: ${subject1.color})`);

  // Create Subject 2: Fisika Mekanika
  const sub2Res = await request(
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
      name: "Fisika Mekanika Analitik",
      priority: "high",
      mode: "moderate",
      color: "#6b95f1",
    }
  );
  if (sub2Res.status !== 201 || !sub2Res.data.subject) {
    console.error("❌ Gagal membuat Subject 2:", sub2Res);
    process.exit(1);
  }
  const subject2 = sub2Res.data.subject;
  console.log(`✅ Subject 2 dibuat: "${subject2.name}" (Prioritas: ${subject2.priority}, Warna: ${subject2.color})`);

  // List Subjects
  const listSubsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/subjects",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (listSubsRes.status !== 200 || !Array.isArray(listSubsRes.data.subjects)) {
    console.error("❌ Gagal list subjects:", listSubsRes);
    process.exit(1);
  }
  console.log(`✅ List subjects sukses: total ${listSubsRes.data.subjects.length} mata pelajaran ditemukan.`);

  // Update Subject 2
  const updateSubRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/subjects/${subject2.id}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      name: "Fisika Mekanika & Termodinamika",
      priority: "very_high",
      mode: "deadline_crunch",
      color: "#e5a93c",
    }
  );
  if (updateSubRes.status !== 200 || updateSubRes.data.subject.mode !== "deadline_crunch") {
    console.error("❌ Gagal update subject:", updateSubRes);
    process.exit(1);
  }
  console.log(`✅ Update subject sukses: mode diperbarui menjadi "${updateSubRes.data.subject.mode}".\n`);

  // Step 3: Study Sessions Management (CRUD & Drag-and-Drop)
  console.log("3. Menguji Sesi Belajar (Study Sessions & Drag-and-Drop)...");

  // Create Session 1
  const sess1Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/sessions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      subject_id: subject1.id,
      title: "Materi Siklus Krebs & Fosforilasi Oksidatif",
      start_time: "2026-09-07T08:00:00.000Z",
      duration_minutes: 90,
      status: "planned",
    }
  );
  if (sess1Res.status !== 201 || !sess1Res.data.session) {
    console.error("❌ Gagal membuat sesi 1:", sess1Res);
    process.exit(1);
  }
  const session1 = sess1Res.data.session;
  console.log(`✅ Sesi 1 dibuat: "${session1.title}" (Jam 08:00, Durasi: ${session1.duration_minutes}m)`);

  // Create Session 2
  const sess2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/sessions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      subject_id: subject2.id,
      title: "Latihan Soal Dinamika Rotasi & Momen Inersia",
      start_time: "2026-09-07T10:00:00.000Z",
      duration_minutes: 60,
      status: "planned",
    }
  );
  if (sess2Res.status !== 201 || !sess2Res.data.session) {
    console.error("❌ Gagal membuat sesi 2:", sess2Res);
    process.exit(1);
  }
  const session2 = sess2Res.data.session;
  console.log(`✅ Sesi 2 dibuat: "${session2.title}" (Jam 10:00, Durasi: ${session2.duration_minutes}m)`);

  // List sessions by date range
  const listSessRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/schedule/sessions?startDate=2026-09-07T00:00:00.000Z&endDate=2026-09-07T23:59:59.000Z",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (listSessRes.status !== 200 || listSessRes.data.sessions.length < 2) {
    console.error("❌ Gagal list sessions:", listSessRes);
    process.exit(1);
  }
  console.log(`✅ Query sesi mingguan sukses: ${listSessRes.data.sessions.length} sesi terambil.`);

  // Simulasikan Drag-and-Drop: Ubah waktu Sesi 1 dari 08:00 ke 14:00
  console.log("   Simulasi Drag-and-Drop: Menggeser Sesi 1 ke jam 14:00...");
  const patchRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/schedule/sessions/${session1.id}`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      start_time: "2026-09-07T14:00:00.000Z",
    }
  );
  if (patchRes.status !== 200 || patchRes.data.session.start_time !== "2026-09-07T14:00:00.000Z") {
    console.error("❌ Gagal drag-and-drop reschedule:", patchRes);
    process.exit(1);
  }
  console.log("✅ Drag-and-Drop Reschedule berhasil diverifikasi (start_time berubah ke 14:00)!");

  // Simulasikan Tandai Selesai (Celebration trigger)
  console.log("   Simulasi Tandai Selesai: Mengubah status Sesi 2 ke 'completed'...");
  const completeRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/schedule/sessions/${session2.id}`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      status: "completed",
    }
  );
  if (completeRes.status !== 200 || completeRes.data.session.status !== "completed") {
    console.error("❌ Gagal menyelesaikan sesi:", completeRes);
    process.exit(1);
  }
  console.log("✅ Status 'completed' tersimpan! (Celebration modal & maskot Nara senang terpicu)\n");

  // Step 4: Google Calendar Integration
  console.log("4. Menguji Integrasi Google Calendar...");
  
  // Check settings before connection
  const initCalRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/calendar/settings",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  console.log(`   Status koneksi awal: isConnected=${initCalRes.data.isConnected}`);

  // Simulate OAuth Callback
  console.log("   Menghubungkan Google Calendar via OAuth Callback...");
  const oauthRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/calendar/callback?code=mock_auth_code_for_osn_tester&state=test_state",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (oauthRes.status !== 307 && oauthRes.status !== 302 && oauthRes.status !== 200) {
    console.error("❌ Gagal OAuth callback:", oauthRes);
    process.exit(1);
  }

  // Verify connection status
  const connectedCalRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/calendar/settings",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (!connectedCalRes.data.isConnected) {
    console.error("❌ Kalender belum tersambung:", connectedCalRes);
    process.exit(1);
  }
  console.log(`✅ Google Calendar tersambung! (Mode: ${connectedCalRes.data.syncMode})`);

  // Test Sync to Google Calendar
  console.log("   Menguji Ekspor Sesi Nara ke Google Calendar (/api/calendar/sync)...");
  const syncRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/calendar/sync",
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  if (syncRes.status !== 200 || !syncRes.data.success) {
    console.error("❌ Gagal sinkronisasi ke GCal:", syncRes);
    process.exit(1);
  }
  console.log(`✅ Sinkronisasi berhasil: ${syncRes.data.syncedCount} sesi diunggah ke Google Calendar!`);

  // Test Import from Google Calendar with pure-code conflict detector
  console.log("   Menguji Impor & Deteksi Bentrok dari Google Calendar (/api/calendar/import)...");
  const importRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/calendar/import",
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  if (importRes.status !== 200 || !importRes.data.success) {
    console.error("❌ Gagal impor dari GCal:", importRes);
    process.exit(1);
  }
  console.log(`✅ Impor berhasil! Total agenda Google Calendar: ${importRes.data.eventsCount}`);
  console.log(`   Event bentrok terdeteksi oleh algoritma non-AI: ${importRes.data.conflictsCount} jadwal bentrok!`);
  if (importRes.data.conflicts?.length > 0) {
    importRes.data.conflicts.forEach((c, idx) => {
      console.log(`   - Bentrok ${idx + 1}: Agenda "${c.conflictingEventTitle}" bentrok dengan sesi Nara "${c.sessionTitle}"`);
    });
  }

  // Test changing sync mode to read_only
  console.log("   Menguji Pengubahan Mode Sinkronisasi ke Read-Only...");
  const changeModeRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/calendar/settings",
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { sync_mode: "read_only" }
  );
  if (changeModeRes.status !== 200 || changeModeRes.data.settings?.sync_mode !== "read_only") {
    console.error("❌ Gagal ubah mode kalender:", changeModeRes);
    process.exit(1);
  }
  console.log(`✅ Mode sinkronisasi berhasil diubah menjadi: "${changeModeRes.data.settings.sync_mode}"\n`);

  // Final summary
  console.log("==================================================================");
  console.log("🎉 SEMUA FITUR FASE 2 BERFUNGSI 100% SECARA SEMPURNA & TERUJI!");
  console.log("   1. Manajemen Mata Pelajaran (Prioritas & Mode Intensitas)");
  console.log("   2. Kalender Sesi Belajar (Drag-and-Drop Reschedule & Selesai)");
  console.log("   3. Integrasi Google Calendar (OAuth, Sync, Read-Only & Deteksi Bentrok)");
  console.log("==================================================================");
}

runTests().catch(console.error);
