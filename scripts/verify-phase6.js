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

async function runPhase6Verification() {
  console.log("===================================================================");
  console.log("🚀 TESTING FASE 6: MODUL SILABUS & ALGORITMA AUTO-JADWAL ($0 AI)");
  console.log("===================================================================\n");

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
      deviceId: "dev_phase6_tester",
      deviceName: "Desktop Tester Phase 6",
      deviceType: "desktop",
    }
  );

  if (actRes.status !== 200 || !actRes.data.success) {
    throw new Error("Gagal aktivasi sesi: " + JSON.stringify(actRes.data));
  }
  const sessionCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log("   ✅ Sesi aktif berhasil dibuat!");

  // Step 2: Create Subject
  console.log("\n2. Menyiapkan Mata Pelajaran Uji (Matematika OSN)...");
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
      name: "Matematika Kombinatorika OSN",
      priority: "very_high",
      mode: "intensive",
      color: "#6B95F1",
    }
  );
  if (subRes.status !== 201 || !subRes.data.subject) {
    throw new Error("Gagal membuat mapel: " + JSON.stringify(subRes.data));
  }
  const subjectId = subRes.data.subject.id;
  console.log(`   ✅ Mapel berhasil dibuat: ${subRes.data.subject.name} (${subjectId})`);

  // Step 3: Create Syllabus with Manual Topic Difficulty Weights (1-5)
  console.log("\n3. Membuat Silabus dengan Pembobotan Manual Siswa (Weight 1-5)...");
  // Set deadline 14 days from now
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 14);

  const syllabusPayload = {
    title: "Silabus Kombinatorika Tingkat Nasional 2026",
    subject_id: subjectId,
    deadline: deadlineDate.toISOString(),
    topics: [
      {
        title: "Prinsip Sarang Burung Merpati (Pigeonhole)",
        order_index: 0,
        weight: 5, // Sangat Sulit (diisi manual oleh siswa)
        estimated_minutes: 90,
      },
      {
        title: "Koefisien Binomial dan Segitiga Pascal",
        order_index: 1,
        weight: 2, // Mudah (diisi manual oleh siswa)
        estimated_minutes: 60,
      },
      {
        title: "Prinsip Inklusi-Eksklusi Lanjut",
        order_index: 2,
        weight: 4, // Sulit (diisi manual oleh siswa)
        estimated_minutes: 90,
      },
      {
        title: "Relasi Rekurensi Linear Homogen",
        order_index: 3,
        weight: 3, // Sedang (diisi manual oleh siswa)
        estimated_minutes: 60,
      },
    ],
  };

  const createSylRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/syllabus",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    syllabusPayload
  );

  if (createSylRes.status !== 201 || !createSylRes.data.syllabus) {
    throw new Error("Gagal membuat silabus: " + JSON.stringify(createSylRes.data));
  }
  const syllabus = createSylRes.data.syllabus;
  const topics = syllabus.topics || [];
  console.log(`   ✅ Silabus berhasil dibuat: "${syllabus.title}" dengan ${topics.length} topik`);
  console.log("      Topik & Bobot:");
  topics.forEach((t) => {
    console.log(`      - [W${t.weight}] ${t.title} (${t.estimated_minutes} mnt) - Status: ${t.status}`);
  });

  // Step 4: Fetch Syllabus Detail & List
  console.log("\n4. Verifikasi Endpoint GET /api/syllabus dan GET /api/syllabus/[id]...");
  const listRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/syllabus",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (listRes.status !== 200 || !Array.isArray(listRes.data.syllabi)) {
    throw new Error("Gagal GET /api/syllabus: " + JSON.stringify(listRes.data));
  }
  console.log(`   ✅ Berhasil fetch daftar silabus: ${listRes.data.syllabi.length} silabus ditemukan`);

  const detailRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/syllabus/${syllabus.id}`,
    method: "GET",
    headers: { Cookie: sessionCookie },
  });
  if (detailRes.status !== 200 || !detailRes.data.syllabus) {
    throw new Error("Gagal GET /api/syllabus/[id]: " + JSON.stringify(detailRes.data));
  }
  console.log(`   ✅ Berhasil fetch detail silabus: "${detailRes.data.syllabus.title}"`);

  // Step 5: Update Topic Status & Weight
  console.log("\n5. Update status topik menjadi 'in_progress'...");
  const topicToUpdate = topics[0];
  const updateTopRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/syllabus/${syllabus.id}/topics/${topicToUpdate.id}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      status: "in_progress",
      weight: 5,
    }
  );
  if (updateTopRes.status !== 200 || !updateTopRes.data.topic) {
    throw new Error("Gagal update topic: " + JSON.stringify(updateTopRes.data));
  }
  console.log(`   ✅ Status topik "${updateTopRes.data.topic.title}" berhasil diubah ke: ${updateTopRes.data.topic.status}`);

  // Step 6: Test Auto-Scheduler Preview (apply: false)
  console.log("\n6. Menguji Algoritma Auto-Scheduler (Preview / Simulasi)...");
  const schedPreviewRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/syllabus/${syllabus.id}/schedule`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { apply: false }
  );

  if (schedPreviewRes.status !== 200 || !schedPreviewRes.data.success) {
    throw new Error("Gagal simulasi auto-schedule: " + JSON.stringify(schedPreviewRes.data));
  }

  const preview = schedPreviewRes.data.plan;
  console.log(`   ✅ Jadwal berhasil disusun (${preview.scheduledSessions.length} sesi dijadwalkan):`);
  preview.scheduledSessions.forEach((s, idx) => {
    const start = new Date(s.start_time);
    const end = new Date(start.getTime() + s.duration_minutes * 60000);
    const timeStr = `${start.toISOString().split("T")[0]} ${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}-${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
    console.log(`      ${idx + 1}. ${s.topic_title} | ${timeStr} (Prioritas: ${s.priority_score.toFixed(2)})`);

    // Verify time constraint: between 16:00 and 22:00
    if (start.getHours() < 16 || start.getHours() >= 22) {
      throw new Error(`Sesi berada di luar rentang belajar 16:00 - 22:00: ${start.getHours()}:${start.getMinutes()}`);
    }
  });

  // Step 7: Test Overload Warning with short deadline
  console.log("\n7. Menguji Overload Warning (Deadline 1 hari dengan 3 topik berdurasi panjang)...");
  const urgentDeadline = new Date();
  urgentDeadline.setDate(urgentDeadline.getDate() + 1); // Only 1 day!

  const urgentSylRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/syllabus",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      title: "Silabus Sangat Mepet (Overload Test)",
      subject_id: subjectId,
      deadline: urgentDeadline.toISOString(),
      topics: [
        { title: "Topik Berat 1", order_index: 0, weight: 5, estimated_minutes: 300 },
        { title: "Topik Berat 2", order_index: 1, weight: 5, estimated_minutes: 300 },
        { title: "Topik Berat 3", order_index: 2, weight: 5, estimated_minutes: 300 },
      ],
    }
  );
  const urgentSyl = urgentSylRes.data.syllabus;

  const overloadSchedRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/syllabus/${urgentSyl.id}/schedule`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { apply: false }
  );

  if (overloadSchedRes.status !== 200) {
    throw new Error("Gagal hit schedule overload test: " + JSON.stringify(overloadSchedRes.data));
  }
  const overloadPlan = overloadSchedRes.data.plan;
  console.log(`   Hasil overload check: ${overloadPlan?.warningMessage || "None"}`);
  if (overloadPlan?.warningMessage) {
    console.log("   ✅ Overload warning terdeteksi secara deterministik!");
  }

  // Step 8: Apply Schedule to study_sessions
  console.log("\n8. Menerapkan Jadwal Otomatis ke study_sessions (apply: true)...");
  const applyRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/syllabus/${syllabus.id}/schedule`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    { apply: true }
  );

  if (applyRes.status !== 200 || !applyRes.data.success) {
    throw new Error("Gagal menerapkan jadwal: " + JSON.stringify(applyRes.data));
  }
  console.log(`   ✅ Sesi berhasil dibuat di study_sessions: ${applyRes.data.createdSessionsCount} sesi`);

  // Verify created study sessions via GET /api/schedule/sessions
  const schedSessionsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/schedule/sessions",
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  const autoSessions = (schedSessionsRes.data.sessions || []).filter(
    (s) => s.source === "auto_generated"
  );
  console.log(`   ✅ Terverifikasi ${autoSessions.length} sesi dengan source='auto_generated' di kalender`);
  if (autoSessions.length === 0) {
    throw new Error("Sesi auto_generated tidak ditemukan di /api/schedule");
  }

  // Step 9: Test Auto Re-Plan endpoint
  console.log("\n9. Menguji Endpoint Auto-Replan (/api/schedule/replan)...");
  const replanRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/replan",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {}
  );

  if (replanRes.status !== 200 || !replanRes.data.success) {
    throw new Error("Gagal memanggil /api/schedule/replan: " + JSON.stringify(replanRes.data));
  }
  console.log(`   ✅ Auto-replan response: ${replanRes.data.message} (overdue cancelled: ${replanRes.data.cancelled_count}, re-planned: ${replanRes.data.replanned_count})`);

  console.log("\n===================================================================");
  console.log("🎉 SEMUA PENGUJIAN FASE 6 (API & ALGORITMA JADWAL) BERHASIL 100%!");
  console.log("===================================================================");
}

runPhase6Verification().catch((err) => {
  console.error("\n❌ ERROR PADA TESTING FASE 6:", err.message);
  process.exit(1);
});
