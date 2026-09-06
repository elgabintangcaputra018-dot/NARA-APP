const puppeteer = require("puppeteer-core");
const http = require("http");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = "C:\\Users\\asuss\\.gemini\\antigravity\\brain\\d2007772-21c1-4248-876a-6585aac214ad";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function captureAllViews() {
  console.log("📸 MEMULAI PENGAMBILAN SEMUA TAMPILAN APLIKASI NARA...");

  // 1. Setup License & Workspace
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
  const licenseCode = genRes.data.license.code;

  // Activate Primary Device
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
      deviceId: "dev_laptop_thinkpad",
      deviceName: "ThinkPad X1 Carbon (Windows 11)",
      deviceType: "desktop",
    }
  );
  const rawCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  const cookieValue = rawCookie.split("=")[1];
  const cookieHeader = `nara_session=${cookieValue}`;

  // Activate 2 more devices for realistic quota showcase
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_ipad_pro",
      deviceName: "iPad Pro 11-inch (Safari iOS)",
      deviceType: "tablet",
    }
  );

  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_samsung_galaxy",
      deviceName: "Samsung Galaxy S24 Ultra",
      deviceType: "mobile",
    }
  );

  // 2. Add Subjects
  const sub1 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/subjects",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      name: "Biologi Sel & Molekuler (OSN)",
      priority: "very_high",
      mode: "intensive",
      color: "#22c55e",
    }
  );

  const sub2 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/subjects",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      name: "Fisika Mekanika Analitik (OSN)",
      priority: "high",
      mode: "deadline_crunch",
      color: "#6b95f1",
    }
  );

  const sub3 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/subjects",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      name: "Kimia Organik & Termodinamika",
      priority: "medium",
      mode: "moderate",
      color: "#e5a93c",
    }
  );

  // 3. Add Study Sessions
  const sess1 = new Date();
  sess1.setHours(8, 0, 0, 0);
  const sess2 = new Date();
  sess2.setHours(11, 0, 0, 0);
  const sess3 = new Date();
  sess3.setHours(14, 0, 0, 0);

  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/sessions",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      subject_id: sub1.data.subject.id,
      title: "Pendalaman Siklus Krebs & Fosforilasi",
      start_time: sess1.toISOString(),
      duration_minutes: 90,
      status: "completed",
    }
  );

  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/sessions",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      subject_id: sub2.data.subject.id,
      title: "Latihan Soal Rotasi & Tensor Inersia",
      start_time: sess2.toISOString(),
      duration_minutes: 60,
      status: "in_progress",
    }
  );

  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/schedule/sessions",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      subject_id: sub3.data.subject.id,
      title: "Reaksi Substitusi Elektrofilik Aromatik",
      start_time: sess3.toISOString(),
      duration_minutes: 75,
      status: "planned",
    }
  );

  // 4. Connect Google Calendar Mock
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/calendar/callback?code=mock_oauth_code_all_views",
      method: "GET",
      headers: { Cookie: cookieHeader },
    }
  );

  // 5. Upload Study Material (Diagram Sel)
  const samplePngBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAYAAAC5/l76AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpCNUU2OEU1MDlCMjcxMUU5OTMzM0JEMUIyRjRBMjIxNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpCNUU2OEU1MTlCMjcxMUU5OTMzM0JEMUIyRjRBMjIxNiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkI1RTY4RTQ0OUIyNzExRTk5MzMzQkQxQjJGNkEyMjE2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkI1RTY4RTQ1OUIyNzExRTk5MzMzQkQxQjJGNkEyMjE2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveHBhY2tldCBlbmQ9InciPz5i5y0bAAAKKElEQVR42u3BMQEAAADCoPVPbQo/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICXAW80AAH5ZpB+AAAAAElFTkSuQmCC";

  const upFile = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      fileName: "Diagram_Struktur_Sel_Hewan.png",
      fileType: "image",
      dataUrl: samplePngBase64,
    }
  );
  const fileId = upFile.data.file.id;

  // Add a PDF file as well
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      fileName: "Silabus_Komprehensif_OSN_Biologi.pdf",
      fileType: "pdf",
      dataUrl: samplePngBase64,
    }
  );

  // Add Diagram Labels
  const l1 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${fileId}/labels`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      area_x: 0.18,
      area_y: 0.16,
      area_width: 0.22,
      area_height: 0.15,
      label_text: "Mitokondria",
      page_number: 1,
    }
  );

  const l2 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${fileId}/labels`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      area_x: 0.48,
      area_y: 0.28,
      area_width: 0.24,
      area_height: 0.18,
      label_text: "Nukleus",
      page_number: 1,
    }
  );

  // 6. Launch Puppeteer to capture all screens
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,920"],
    defaultViewport: { width: 1280, height: 920 },
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: "nara_session",
    value: cookieValue,
    domain: "localhost",
    path: "/",
  });

  // SCREEN 1: Beranda / Dashboard
  console.log("📸 Mengambil Screen 1: Beranda...");
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_01_beranda.png") });

  // SCREEN 2: Mata Pelajaran
  console.log("📸 Mengambil Screen 2: Mata Pelajaran...");
  await page.goto("http://localhost:3000/dashboard/subjects", { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_02_mata_pelajaran.png") });

  // SCREEN 3: Jadwal Belajar Kalender
  console.log("📸 Mengambil Screen 3: Jadwal Belajar...");
  await page.goto("http://localhost:3000/dashboard/schedule", { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_03_jadwal_kalender.png") });

  // SCREEN 4: Google Calendar Settings
  console.log("📸 Mengambil Screen 4: Google Calendar Settings...");
  await page.goto("http://localhost:3000/dashboard/settings/calendar", { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_04_google_calendar.png") });

  // SCREEN 5: Kelola Perangkat
  console.log("📸 Mengambil Screen 5: Kelola Perangkat (3 Perangkat)...");
  await page.goto("http://localhost:3000/dashboard/settings/devices", { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_05_kelola_perangkat.png") });

  // SCREEN 6: Galeri Materi Dokumen
  console.log("📸 Mengambil Screen 6: Galeri Materi Dokumen...");
  await page.goto("http://localhost:3000/dashboard/files", { waitUntil: "networkidle2" });
  await sleep(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_06_galeri_materi.png") });

  // SCREEN 7: Ruang Anotasi & Coretan
  console.log("📸 Mengambil Screen 7: Ruang Anotasi & Coretan...");
  await page.goto(`http://localhost:3000/dashboard/files/${fileId}/annotate`, { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_07_ruang_anotasi.png") });

  // SCREEN 8: Mode Tandai Titik Label (Active)
  console.log("📸 Mengambil Screen 8: Mode Tandai Titik Label...");
  await page.click("#btn-toggle-label-mode");
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_08_mode_tandai_label.png") });

  // SCREEN 9: Active Recall: Kotak Tertutup (Masked)
  console.log("📸 Mengambil Screen 9: Active Recall (Kotak Tertutup)...");
  await page.goto(`http://localhost:3000/dashboard/files/${fileId}/recall`, { waitUntil: "networkidle2" });
  await sleep(1200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_09_recall_masked.png") });

  // SCREEN 10: Active Recall: Modal Tebakan / Buka Kunci
  console.log("📸 Mengambil Screen 10: Active Recall Modal Tebakan...");
  const occlusionBoxes = await page.$$(".occlusion-box");
  if (occlusionBoxes.length > 0) {
    await occlusionBoxes[0].click();
    await sleep(600);
    await page.waitForSelector("#btn-reveal-answer");
    await page.click("#btn-reveal-answer");
    await sleep(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_10_recall_modal_guess.png") });

    // Answer both to trigger celebration
    await page.click("#btn-self-correct");
    await sleep(600);
    await page.click("#btn-close-feedback");
    await sleep(600);

    const boxes2 = await page.$$(".occlusion-box");
    await boxes2[1].click();
    await sleep(600);
    await page.click("#btn-reveal-answer");
    await sleep(600);
    await page.click("#btn-self-correct");
    await sleep(600);
    await page.click("#btn-close-feedback");
    await sleep(1500);

    // SCREEN 11: Selebrasi 100% Penguasaan
    console.log("📸 Mengambil Screen 11: Selebrasi 100% Penguasaan...");
    await page.waitForSelector("#btn-celebration-repeat", { timeout: 5000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "screen_11_recall_success_celebration.png") });
  }

  await browser.close();
  console.log("✅ SEMUA 11 TAMPILAN BERHASIL DIAMBIL!");
}

captureAllViews().catch((err) => {
  console.error("❌ Gagal mengambil semua screenshot:", err);
  process.exit(1);
});
