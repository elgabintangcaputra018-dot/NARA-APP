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

async function runBrowserRecallTest() {
  console.log("==================================================================");
  console.log("🦊 NARA — UJI OTOMATIS BROWSER: DIAGRAM ACTIVE RECALL (FASE 4)");
  console.log("==================================================================\n");

  // Step 1: Admin setup workspace & session
  console.log("1. Menyiapkan Lisensi & Sesi Siswa...");
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
      deviceId: "dev_recall_browser_tester",
      deviceName: "Chrome Headless Recall Tester",
    }
  );

  const rawCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  const cookieValue = rawCookie.split("=")[1];
  console.log(`✅ Lisensi aktif: ${licenseCode}`);
  console.log(`   Session Token: ${cookieValue}\n`);

  // Step 2: Upload study material (Diagram Sel Biologi)
  console.log("2. Menyiapkan File Materi Diagram Sel...");
  const samplePngBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAYAAAC5/l76AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpCNUU2OEU1MDlCMjcxMUU5OTMzM0JEMUIyRjRBMjIxNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpCNUU2OEU1MTlCMjcxMUU5OTMzM0JEMUIyRjRBMjIxNiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkI1RTY4RTQ0OUIyNzExRTk5MzMzQkQxQjJGNkEyMjE2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkI1RTY4RTQ1OUIyNzExRTk5MzMzQkQxQjJGNkEyMjE2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveHBhY2tldCBlbmQ9InciPz5i5y0bAAAKKElEQVR42u3BMQEAAADCoPVPbQo/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICXAW80AAH5ZpB+AAAAAElFTkSuQmCC";

  const upRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `nara_session=${cookieValue}`,
      },
    },
    {
      fileName: "Diagram_Struktur_Sel_Hewan.png",
      fileType: "image",
      dataUrl: samplePngBase64,
    }
  );

  const fileId = upRes.data.file.id;
  console.log(`✅ File berhasil dibuat: ID=${fileId} ("${upRes.data.file.file_name}")\n`);

  // Step 3: Launch Headless Chrome
  console.log("3. Menjalankan Chrome Headless...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,950"],
    defaultViewport: { width: 1280, height: 950 },
  });

  const page = await browser.newPage();

  // Set session cookie
  await page.setCookie({
    name: "nara_session",
    value: cookieValue,
    domain: "localhost",
    path: "/",
  });

  // Step 4: Open Ruang Anotasi
  console.log(`4. Membuka Ruang Anotasi (/dashboard/files/${fileId}/annotate)...`);
  await page.goto(`http://localhost:3000/dashboard/files/${fileId}/annotate`, {
    waitUntil: "networkidle2",
  });
  await sleep(1500);

  // Step 5: Toggle Mode Tandai Label
  console.log("5. Mengaktifkan 'Mode Tandai Label'...");
  await page.waitForSelector("#btn-toggle-label-mode");
  await page.click("#btn-toggle-label-mode");
  await sleep(800);

  // Step 6: Drag to mark Label 1 (Mitokondria)
  console.log("6. Menandai Kotak Titik 1 (Mitokondria)...");
  // Find canvas container position
  const containerHandle = await page.$("main > div.relative");
  const boundingBox = await containerHandle.boundingBox();

  if (!boundingBox) throw new Error("Canvas container bounding box not found");

  const startX1 = boundingBox.x + 120;
  const startY1 = boundingBox.y + 140;
  const endX1 = startX1 + 180;
  const endY1 = startY1 + 120;

  await page.mouse.move(startX1, startY1);
  await page.mouse.down();
  await page.mouse.move(endX1, endY1, { steps: 8 });
  await page.mouse.up();
  await sleep(600);

  // Wait for label modal
  await page.waitForSelector("#input-label-text");
  await page.type("#input-label-text", "Mitokondria");
  await page.click("#btn-save-label");
  await sleep(1000);
  console.log("   ✓ Titik 1 'Mitokondria' tersimpan.");

  // Step 7: Drag to mark Label 2 (Nukleus)
  console.log("7. Menandai Kotak Titik 2 (Nukleus)...");
  const startX2 = boundingBox.x + 360;
  const startY2 = boundingBox.y + 200;
  const endX2 = startX2 + 200;
  const endY2 = startY2 + 140;

  await page.mouse.move(startX2, startY2);
  await page.mouse.down();
  await page.mouse.move(endX2, endY2, { steps: 8 });
  await page.mouse.up();
  await sleep(600);

  await page.waitForSelector("#input-label-text");
  await page.type("#input-label-text", "Nukleus");
  await page.click("#btn-save-label");
  await sleep(1000);
  console.log("   ✓ Titik 2 'Nukleus' tersimpan.");

  // Checkpoint 1: Taking screenshot of marked labels
  const cp1Path = path.join(ARTIFACT_DIR, "checkpoint_marking_labels.png");
  await page.screenshot({ path: cp1Path });
  console.log(`📸 Checkpoint 1 tersimpan: ${cp1Path}\n`);

  // Step 8: Navigate to Active Recall Page
  console.log("8. Menuju Halaman Active Recall (/dashboard/files/[id]/recall)...");
  await page.waitForSelector("#btn-goto-recall");
  await page.click("#btn-goto-recall");
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  await sleep(1500);

  // Verify occlusion boxes rendered
  const occlusionBoxes = await page.$$(".occlusion-box");
  console.log(`   ✓ Ditemukan ${occlusionBoxes.length} kotak oklusi (tertutup solid).`);
  if (occlusionBoxes.length !== 2) throw new Error("Expected 2 occlusion boxes");

  // Checkpoint 2: Taking screenshot of masked occlusion boxes
  const cp2Path = path.join(ARTIFACT_DIR, "checkpoint_recall_masked.png");
  await page.screenshot({ path: cp2Path });
  console.log(`📸 Checkpoint 2 tersimpan: ${cp2Path}\n`);

  // Step 9: Answering Box 1 with Auto-Check (Typing Guess)
  console.log("9. Menguji Tebakan Otomatis pada Titik 1...");
  await occlusionBoxes[0].click();
  await sleep(600);

  await page.waitForSelector("#input-recall-guess");
  await page.type("#input-recall-guess", "mitokondria");
  await page.click("#btn-submit-guess");
  await sleep(800);

  // Close feedback dialog
  await page.waitForSelector("#btn-close-feedback");
  await page.click("#btn-close-feedback");
  await sleep(800);
  console.log("   ✓ Titik 1 terjawab 'mitokondria' (Benar!)");

  // Step 10: Answering Box 2 with Self-Grading ("Saya Benar")
  console.log("10. Menguji Self-Grading ('Saya Benar') pada Titik 2...");
  const boxesAfterFirst = await page.$$(".occlusion-box");
  await boxesAfterFirst[1].click();
  await sleep(600);

  await page.waitForSelector("#btn-reveal-answer");
  await page.click("#btn-reveal-answer");
  await sleep(600);

  await page.waitForSelector("#btn-self-correct");
  await page.click("#btn-self-correct");
  await sleep(800);

  await page.waitForSelector("#btn-close-feedback");
  await page.click("#btn-close-feedback");
  await sleep(1500);
  console.log("   ✓ Titik 2 dinilai 'Saya Benar' (100% Selesai!)");

  // Step 11: Verify 100% Celebration Modal
  console.log("11. Memverifikasi Modal Selebrasi 100% Penguasaan...");
  await page.waitForSelector("#btn-celebration-repeat", { timeout: 5000 });

  // Checkpoint 3: Taking screenshot of celebration modal
  const cp3Path = path.join(ARTIFACT_DIR, "checkpoint_recall_completed_success.png");
  await page.screenshot({ path: cp3Path });
  console.log(`📸 Checkpoint 3 tersimpan: ${cp3Path}\n`);

  await browser.close();

  console.log("==================================================================");
  console.log("🎉 SELURUH PENGUJIAN OTOMASI BROWSER FASE 4 SUKSES 100%!");
  console.log("==================================================================\n");
}

runBrowserRecallTest().catch((err) => {
  console.error("❌ BROWSER RECALL TEST FAILED:", err);
  process.exit(1);
});
